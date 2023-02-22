#ifdef GL_ES
precision mediump float;
#endif

uniform vec3 uLightPos0;
uniform vec3 uLightPos1;
uniform vec3 uLightPos2;
uniform vec3 uLightPos3;
uniform vec3 uCameraPos;
uniform vec3 uLightRadiance;

uniform sampler2D uAlbedoMap;
uniform float uMetallic;
uniform float uRoughness;
uniform sampler2D uLTC1;
uniform sampler2D uLTC2;

varying highp vec2 vTextureCoord;
varying highp vec3 vFragPos;
varying highp vec3 vNormal;

const float INV_2PI = 0.1591549431;

vec3 ClampPoint(vec3 v1, vec3 v2)
{
  return normalize(-v1.z * v2 + v2.z * v1);
}

vec3 IntegrateEdgeVec(vec3 v1, vec3 v2)
{
    float x = dot(v1, v2);
    float y = abs(x);

    float a = 0.8543985 + (0.4965155 + 0.0145206*y)*y;
    float b = 3.4175940 + (4.1616724 + y)*y;
    float v = a / b;

    float theta_sintheta = (x > 0.0) ? v : 0.5*inversesqrt(max(1.0 - x*x, 1e-7)) - v;

    return cross(v1, v2)*theta_sintheta;
}

float CalculateInter(mat3 Matrix)
{
  int n = 4;
  int config = 0;

  vec3 v1 = (Matrix * (uLightPos0 - vFragPos));
  vec3 v0 = (Matrix * (uLightPos1 - vFragPos));
  vec3 v3 = (Matrix * (uLightPos2 - vFragPos));
  vec3 v2 = (Matrix * (uLightPos3 - vFragPos));
  vec3 v4 = v3;

  if(v0.z >= 0.0)
  {
    config += 8;
  }
  if(v1.z >= 0.0)
  {
    config += 4;
  }
  if(v2.z >= 0.0)
  {
    config += 2;
  }
  if(v3.z >= 0.0)
  {
    config += 1;
  }
  
  if(config == 0)//no
  {
    n = 0;
  }
  else if(config == 1)//v3
  {
    n = 3;
    v0 = ClampPoint(v0, v3);
    v1 = ClampPoint(v2, v3);
    v2 = v3;
  }
  else if(config == 2)//v2
  {
    n = 3;
    v0 = ClampPoint(v3, v2);
    v1 = ClampPoint(v1, v2);
  }
  else if(config == 3)//v2v3
  {
    n = 4;
    v0 = ClampPoint(v0, v3);
    v1 = ClampPoint(v1, v2);
  }
  else if(config == 4)//v1
  {
    n = 3;
    v0 = ClampPoint(v0, v1);
    v2 = ClampPoint(v2, v1);
  }
  else if(config == 5)//v1v3
  {
    n = 0;
  }
  else if(config == 6)//v1v2
  {
    n = 4;
    v0 = ClampPoint(v0, v1);
    v3 = ClampPoint(v3, v2);
  }
  else if(config == 7)//v1v2v3
  {
    n = 5;
    v4 = ClampPoint(v0, v3);
    v0 = ClampPoint(v0, v1);
  }
  else if(config == 8)//v0
  {
    n = 3;
    v1 = ClampPoint(v1, v0);
    v2 = ClampPoint(v3, v0);
  }
  else if(config == 9)//v0v3
  {
    n = 4;
    v1 = ClampPoint(v1, v0);
    v2 = ClampPoint(v2, v3);
  }
  else if(config == 10)//v0v2
  {
    n = 0;
  }
  else if(config == 11)//v0v2v3
  {
    n = 5;
    v4 = v3;
    v3 = v2;
    v2 = ClampPoint(v1, v2);
    v1 = ClampPoint(v1, v0);
  }
  else if(config == 12)//v0v1
  {
    n = 4;
    v2 = ClampPoint(v2, v1);
    v3 = ClampPoint(v3, v0);
  }
  else if(config == 13)//v0v1v3
  {
    n = 5;
    v4 = v3;
    v3 = ClampPoint(v2, v3);
    v2 = ClampPoint(v2, v1);
  }
  else if(config == 14)//v0v1v2
  {
    n = 5;
    v4 = ClampPoint(v3, v0);
    v3 = ClampPoint(v3, v2);
  }
  else if(config == 15)//v0v1v2v3
  {
    n = 4;
  }

  if(n == 0)
  {
    return 0.0;
  }

  v0 = normalize(v0);
  v1 = normalize(v1);
  v2 = normalize(v2);
  v3 = normalize(v3);
  v4 = normalize(v4);

  float Inter  = INV_2PI * (normalize(cross(v0, v1)).z * acos(dot(v0, v1)) + 
                            normalize(cross(v1, v2)).z * acos(dot(v1, v2)));
  if(n == 3)
  {
    Inter += INV_2PI * normalize(cross(v2, v0)).z * acos(dot(v2, v0));
  }
  else if(n == 4)
  {
    Inter += INV_2PI * (normalize(cross(v2, v3)).z * acos(dot(v2, v3)) + 
                        normalize(cross(v3, v0)).z * acos(dot(v3, v0)));
  }
  else if(n == 5)
  {
    Inter += INV_2PI * (normalize(cross(v2, v3)).z * acos(dot(v2, v3)) + 
                        normalize(cross(v3, v4)).z * acos(dot(v3, v4)) + 
                        normalize(cross(v4, v0)).z * acos(dot(v4, v0)));
  }

  /*vec3 dir = vFragPos - uLightPos0;
  vec3 lightNormal = cross(uLightPos1 - uLightPos0, uLightPos3 - uLightPos0);
  bool behind = (dot(dir, lightNormal) < 0.0);

  vec3 v1 = normalize(Matrix * (uLightPos0 - vFragPos));
  vec3 v0 = normalize(Matrix * (uLightPos1 - vFragPos));
  vec3 v3 = normalize(Matrix * (uLightPos2 - vFragPos));
  vec3 v2 = normalize(Matrix * (uLightPos3 - vFragPos));

  //vec3 vsum = vec3(INV_2PI * (normalize(cross(v0, v1)).z * acos(dot(v0, v1)) + 
                              //normalize(cross(v1, v2)).z * acos(dot(v1, v2)) + 
                              //normalize(cross(v2, v3)).z * acos(dot(v2, v3)) + 
                              //normalize(cross(v3, v0)).z * acos(dot(v3, v0))));
  vec3 vsum = IntegrateEdgeVec(v0, v1) + IntegrateEdgeVec(v1, v2) + 
              IntegrateEdgeVec(v2, v3) + IntegrateEdgeVec(v3, v0);

  float len = length(vsum);
  float z = vsum.z/len;

  if (behind)
      z = -z;

  vec2 uv = vec2(z * 0.5 + 0.5, len);
  uv = uv * 63.0 / 64.0 + 0.5 / 64.0;

  float scale = texture2D(uLTC2, uv).w;

  float Inter = len*scale;

  if (behind)
      Inter = 0.0;*/

  return max(Inter, 0.0);
}

float CalculateBRDF(float NdotV, vec3 V, vec3 N, vec4 ABCD)
{
  mat3 InvM = mat3(vec3(ABCD.x, 0.0, ABCD.y), 
                   vec3(0.0, 1.0, 0.0), 
                   vec3(ABCD.z, 0.0, ABCD.w));

  vec3 myX = normalize(V - NdotV * N);
  vec3 myZ = N;
  vec3 myY = cross(myZ, myX);

  mat3 ToNormal = mat3(vec3(myX.x, myY.x, myZ.x), vec3(myX.y, myY.y, myZ.y), vec3(myX.z, myY.z, myZ.z));

  float Inter  = CalculateInter(InvM * ToNormal);

  return Inter;
}


void main(void) {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCameraPos);
  float NdotV = dot(N, V); 

  vec3 albedo = pow(texture2D(uAlbedoMap, vTextureCoord).rgb, vec3(2.2));

  vec3 F0 = vec3(0.04); 
  F0 = mix(F0, albedo, uMetallic);

  vec2 sample = vec2(uRoughness, sqrt(1.0 - NdotV * NdotV));
  sample = sample * 63.0 / 64.0 + 0.5 / 64.0;
  vec4 ABCD = texture2D(uLTC1, sample);
  vec4 NdFd = texture2D(uLTC2, sample);

  float spec = CalculateBRDF(NdotV, V, N, ABCD);
  float diff = CalculateBRDF(NdotV, V, N, vec4(1.0, 0.0, 0.0, 1.0));
  
  vec3 color = pow(uLightRadiance * (spec * (F0 * NdFd.x + (vec3(1.0) - F0) * NdFd.y) + diff * albedo), vec3(1.0/2.2));
  
  gl_FragColor = vec4(color, 1.0);
}