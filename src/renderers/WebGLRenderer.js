class WebGLRenderer {
    meshes = [];
    shadowMeshes = [];
    lights = [];
    polygonlights = [];

    constructor(gl, camera) {
        this.gl = gl;
        this.camera = camera;
    }

    addLight(light) {
        this.lights.push({
            entity: light,
            meshRender: new MeshRender(this.gl, light.mesh, light.mat)
        });
    }
    addPolygonlight(polygonlight){ this.polygonlights.push(new MeshRender(this.gl, polygonlight.mesh, polygonlight.mat)); }
    addMeshRender(mesh) { this.meshes.push(mesh); }
    addShadowMeshRender(mesh) { this.shadowMeshes.push(mesh); }

    render() {
        const gl = this.gl;

        gl.clearColor(0.0, 0.0, 0.0, 1.0); // Clear to black, fully opaque
        gl.clearDepth(1.0); // Clear everything
        gl.enable(gl.DEPTH_TEST); // Enable depth testing
        gl.depthFunc(gl.LEQUAL); // Near things obscure far things

        console.assert(this.lights.length != 0, "No light");
        console.assert(this.lights.length == 1, "Multiple lights");

        // Handle light
        const timer = Date.now() * 0.00025;//获取系统时间
        let lightPos = [ Math.sin(timer * 6) * 100, 
                         Math.cos(timer * 4) * 150, 
                         Math.cos(timer * 2) * 100 ];

        const modelTranslation = [guiParams.modelTransX, guiParams.modelTransY, guiParams.modelTransZ];
        const modelScale = [guiParams.modelScaleX, guiParams.modelScaleY, guiParams.modelScaleZ];
        const modelRotate = [guiParams.modelRotateX, guiParams.modelRotateY, guiParams.modelRotateZ];
        let meshTrans = new TRSTransform(modelTranslation, modelScale, modelRotate);

        let modelMatrix = mat4.create();
        mat4.identity(modelMatrix);
        mat4.translate(modelMatrix, modelMatrix, meshTrans.translate);
		mat4.scale(modelMatrix, modelMatrix, meshTrans.scale);
		mat4.rotateX(modelMatrix, modelMatrix, meshTrans.rotate[0]);
		mat4.rotateY(modelMatrix, modelMatrix, meshTrans.rotate[1]);
		mat4.rotateZ(modelMatrix, modelMatrix, meshTrans.rotate[2]);

        let pos = [];
        for( let l = 0; l < 4; l++){
            let vec = [PoligonLightPos[3 * l + 0], PoligonLightPos[3 * l + 1], PoligonLightPos[3 * l + 2], 1];
            let temp = vec4.create();
            vec4.transformMat4(temp, vec, modelMatrix);
            pos[l] = vec3.fromValues(temp[0] / temp[3], temp[1] / temp[3], temp[2] / temp[3]);
        }

        for (let l = 0;l < this.polygonlights.length; l++){
            this.polygonlights[l].mesh.transform = meshTrans;
            this.polygonlights[l].draw(this.camera);

            for (let i = 0; i < this.meshes.length; i++) {
                this.gl.useProgram(this.meshes[i].shader.program.glShaderProgram);

                for (let k in this.meshes[i].material.uniforms) {
                    if (k == 'uLightRadiance') {
                        gl.uniform3fv(
                            this.meshes[i].shader.program.uniforms[k],
                            [guiParams.RlightRadiance, guiParams.GlightRadiance, guiParams.BlightRadiance]);
                    } else if (k == 'uRoughness') {
                        gl.uniform1f(
                            this.meshes[i].shader.program.uniforms[k],
                        guiParams.roughness);
                    } else if (k == 'uLightPos0') {
                        gl.uniform3fv(
                            this.meshes[i].shader.program.uniforms[k],
                            [pos[0][0], pos[0][1], pos[0][2]]);
                    } else if(k == 'uLightPos1'){
                        gl.uniform3fv(
                            this.meshes[i].shader.program.uniforms[k],
                            [pos[1][0] ,pos[1][1], pos[1][2]]);
                    } else if(k == 'uLightPos2'){
                        gl.uniform3fv(
                            this.meshes[i].shader.program.uniforms[k],
                            [pos[2][0] ,pos[2][1], pos[2][2]]);
                    } else if(k == 'uLightPos3'){
                        gl.uniform3fv(
                            this.meshes[i].shader.program.uniforms[k],
                            [pos[3][0] ,pos[3][1], pos[3][2]]);
                    }
                }
                this.meshes[i].draw(this.camera);
            }
            
        }

        /*for (let l = 0; l < this.lights.length; l++) {
            // Draw light
            // TODO: Support all kinds of transform
            this.lights[l].entity.lightPos = lightPos;
            this.lights[l].meshRender.mesh.transform.translate = this.lights[l].entity.lightPos;
            this.lights[l].meshRender.draw(this.camera);

            for (let i = 0; i < this.meshes.length; i++) {
            // Camera pass
                this.gl.useProgram(this.meshes[i].shader.program.glShaderProgram);
                this.gl.uniform3fv(this.meshes[i].shader.program.uniforms.uLightPos, this.lights[l].entity.lightPos);
                this.meshes[i].draw(this.camera);
            }

        }*/

    }
}