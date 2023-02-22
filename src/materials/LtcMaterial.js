class LtcMaterial extends Material {

    constructor(albedo, metallic, roughness, vertexShader, fragmentShader) {
        super({
            'uAlbedoMap': { type: 'texture', value: albedo },
            'uMetallic': { type: '1f', value: metallic },
            'uRoughness': { type: 'roughness', value: roughness },
            'uLTC1': { type: 'Ltc1', value: null },
            'uLTC2': { type: 'Ltc2', value: null },
            'uLightRadiance': { type: 'lightRadiance', value: null },
            'uLightPos0': { type: 'LightPos0', value: null },
            'uLightPos1': { type: 'LightPos1', value: null },
            'uLightPos2': { type: 'LightPos2', value: null },
            'uLightPos3': { type: 'LightPos3', value: null },
        }, [], vertexShader, fragmentShader);

    }
}

async function buildLtcMaterial(albedo, metallic, roughness, vertexPath, fragmentPath) {

    let vertexShader = await getShaderString(vertexPath);
    let fragmentShader = await getShaderString(fragmentPath);

    return new LtcMaterial(albedo, metallic, roughness, vertexShader, fragmentShader);
}