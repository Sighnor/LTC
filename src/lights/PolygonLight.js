class PolygonLight {

    constructor(lightRadiance, lightPos, gl) {
        this.mesh = Mesh.Polygon(setTransform(0, 0, 0, 1, 1, 1, 0));
        this.mat = new EmissiveMaterial(lightRadiance);
        this.lightRadiance = lightRadiance;
        this.lightPos = lightPos;
    }
}