let PoligonLightPos = 
[-1.0, 0.0, 0.0,
	1.0, 0.0, 0.0,
	1.0, 2.0, 0.0,
	-1.0, 2.0, 0.0];

var cameraPosition = [0, 80, 300];

var envmap = [
	'assets/cubemap/CornellBox'
];

var guiParams = {
	envmapId: 0,
	modelTransX: 0,
	modelTransY: 0,
	modelTransZ: 50,
	modelScaleX: 50,
	modelScaleY: 50,
	modelScaleZ: 50,
	modelRotateX: 0,
	modelRotateY: 0,
	modelRotateZ: 0,
	RlightRadiance: 5,
	GlightRadiance: 5,
	BlightRadiance: 5,
	roughness: 0.5,
}

var cubeMaps = [];

//生成的纹理的分辨率，纹理必须是标准的尺寸 256*256 1024*1024  2048*2048
var resolution = 2048;
let brdflut, eavglut, invM, ltc;
let ltc_texture_1,ltc_texture_2;
let envMapPass = null;

GAMES202Main();

async function GAMES202Main() {
	// Init canvas and gl
	const canvas = document.querySelector('#glcanvas');
	canvas.width = window.screen.width;
	canvas.height = window.screen.height;
	/*const gl = canvas.getContext('webgl');
	if (!gl) {
		alert('Unable to initialize WebGL. Your browser or machine may not support it.');
		return;
	}*/

	try {
        gl = canvas.getContext("webgl2");
    } catch(error) { }

    if (!gl) {
        alert("WebGL not supported");
        throw "cannot create webgl context";
    }

    // Check for float-RT support
    if (!gl.getExtension("EXT_color_buffer_float")) {
        alert("EXT_color_buffer_float not supported");
        throw "missing webgl extension";
    }

    if (!gl.getExtension("OES_texture_float_linear")) {
        alert("OES_texture_float_linear not supported");
        throw "missing webgl extension";
    }

	// Add camera
	const camera = new THREE.PerspectiveCamera(75, gl.canvas.clientWidth / gl.canvas.clientHeight, 1e-2, 1000);
	camera.position.set(cameraPosition[0], cameraPosition[1], cameraPosition[2]);

	// Add resize listener
	function setSize(width, height) {
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
	}
	setSize(canvas.clientWidth, canvas.clientHeight);
	window.addEventListener('resize', () => setSize(canvas.clientWidth, canvas.clientHeight));

	// Add camera control
	const cameraControls = new THREE.OrbitControls(camera, canvas);
	cameraControls.enableZoom = true;
	cameraControls.enableRotate = true;
	cameraControls.enablePan = true;
	cameraControls.rotateSpeed = 0.3;
	cameraControls.zoomSpeed = 1.0;
	cameraControls.panSpeed = 0.8;
	cameraControls.target.set(0, 0, 0);

	// Add renderer
	const renderer = new WebGLRenderer(gl, camera);

	// Add lights
	// light - is open shadow map == true
	let lightPos = [100, 0, 100];
	let lightRadiance = [1, 1, 1];
	lightDir = {
		'x': 0,
		'y': 0,
		'z': -1,
	};
	let lightUp = [1, 0, 0];
	const directionLight = new DirectionalLight(lightRadiance, lightPos, lightDir, lightUp, renderer.gl);
	renderer.addLight(directionLight);
	const polygonlight = new PolygonLight(lightRadiance, lightPos ,renderer.gl);
	renderer.addPolygonlight(polygonlight);

	// Add Sphere
	let img = new Image(); // brdfLUT
	img.src = 'assets/ball/GGX_E_LUT.png';
	var loadImage = async img => {
		return new Promise((resolve, reject) => {
			img.onload = async () => {
				console.log("Image Loaded");
				resolve(true);
			};
		});
	};

	await loadImage(img);
	brdflut = new Texture();
	brdflut.CreateImageTexture(gl, img);

	let img1 = new Image(); 
	img1.src = 'assets/ball/GGX_Eavg_LUT.png';
	var loadImage = async img => {
		return new Promise((resolve, reject) => {
			img.onload = async () => {
				console.log("Image Loaded");
				resolve(true);
			};
		});
	};
	await loadImage(img1);
	eavglut = new Texture();
	eavglut.CreateImageTexture(gl, img1);

	let img2 = new Image();
	img2.src = 'assets/ball/ltc_1.png';
	var loadImage = async img => {
		return new Promise((resolve, reject) => {
			img.onload = async () => {
				console.log("Image Loaded");
				resolve(true);
			};
		});
	};
	await loadImage(img2);
	invM = new Texture();
	invM.CreateImageTexture(gl, img2);

	let img3 = new Image(); 
	img3.src = 'assets/ball/ltc_2.png';
	var loadImage = async img => {
		return new Promise((resolve, reject) => {
			img.onload = async () => {
				console.log("Image Loaded");
				resolve(true);
			};
		});
	};
	await loadImage(img3);
	ltc = new Texture();
	ltc.CreateImageTexture(gl, img3);

	let metallic = 1.0;

	let Sphere0Transform = setTransform(0, 0, 250, 180, 180, 180, 0, 0, 0);
	loadGLTF(renderer, 'assets/ball/', 'ball', 'LtcMaterial', Sphere0Transform, metallic, 0.15);

	let colorMap = new Texture();
	let kd = [0.7216, 0.451, 0.2]; // copper
	colorMap.CreateConstantTexture(renderer.gl, kd, true);

	material = buildLtcMaterial(colorMap, metallic, 0.15, "./src/shaders/LtcShader/LtcVertexShader.glsl", "./src/shaders/LtcShader/LtcFragment.glsl");
	material.then((data) => {
		let meshRender = new MeshRender(renderer.gl, Mesh.Ground(setTransform(0, 0, 0, 500, 1, 500, 0)), data);
		renderer.addMeshRender(meshRender);
	});
	
	// Add SkyBox
	for (let i = 0; i < envmap.length; i++) {
		let urls = [
			envmap[i] + '/posx.jpg',
			envmap[i] + '/negx.jpg',
			envmap[i] + '/posy.jpg',
			envmap[i] + '/negy.jpg',
			envmap[i] + '/posz.jpg',
			envmap[i] + '/negz.jpg',
		];
		cubeMaps.push(new CubeTexture(gl, urls))
		await cubeMaps[i].init();
	}
	let skyBoxTransform = setTransform(0, 50, 50, 150, 150, 150);
	loadOBJ(renderer, 'assets/testObj/', 'testObj', 'SkyBoxMaterial', skyBoxTransform);

	ltc_texture_1 = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, ltc_texture_1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 64, 64, 0, gl.RGBA, gl.FLOAT, new Float32Array(g_ltc_1));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

	ltc_texture_2 = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, ltc_texture_2);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 64, 64, 0, gl.RGBA, gl.FLOAT, new Float32Array(g_ltc_2));
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

	function createGUI() {
		const gui = new dat.gui.GUI();
		const panelModel = gui.addFolder('Switch Environemtn Map');
		const panelModelTrans = panelModel.addFolder('Translation');
		const panelModelScale = panelModel.addFolder('Scale');
		const panelModelRotate = panelModel.addFolder('Rotate');
		const panelModelRGB = panelModel.addFolder('RGB');
		const panelModelRoughness = panelModel.addFolder('Roughness');
		panelModel.add(guiParams, 'envmapId', { 'CornellBox':0}).name('Envmap Name');
		panelModelTrans.add(guiParams, 'modelTransX', -200, 200, 0.1).name('X');
		panelModelTrans.add(guiParams, 'modelTransY', -200, 200, 0.1).name('Y');
		panelModelTrans.add(guiParams, 'modelTransZ', -200, 200, 0.1).name('Z');
		panelModelScale.add(guiParams, 'modelScaleX', 10, 200, 0.1).name('X');
		panelModelScale.add(guiParams, 'modelScaleY', 10, 200, 0.1).name('Y');
		panelModelScale.add(guiParams, 'modelScaleZ', 10, 200, 0.1).name('Z');
		panelModelRotate.add(guiParams, 'modelRotateX', -2, 2, 0.02).name('X');
		panelModelRotate.add(guiParams, 'modelRotateY', -2, 2, 0.02).name('Y');
		panelModelRotate.add(guiParams, 'modelRotateZ', -2, 2, 0.02).name('Z');
		panelModelRGB.add(guiParams, 'RlightRadiance', 0, 10, 0.1).name('R');
		panelModelRGB.add(guiParams, 'GlightRadiance', 0, 10, 0.1).name('G');
		panelModelRGB.add(guiParams, 'BlightRadiance', 0, 10, 0.1).name('B');
		panelModelRoughness.add(guiParams, 'roughness', 0.10, 1, 0.01).name('roughness');
		panelModel.open();
		panelModelTrans.open();
		panelModelScale.open();
		panelModelRotate.open();
		panelModelRGB.open();
		panelModelRoughness.open();
	}

	createGUI();

	function mainLoop(now) {
		cameraControls.update();

		renderer.render();

		requestAnimationFrame(mainLoop);
	}
	requestAnimationFrame(mainLoop);
}

function setTransform(t_x, t_y, t_z, s_x, s_y, s_z, r_x = 0, r_y = 0, r_z = 0) {
	return {
		modelTransX: t_x,
		modelTransY: t_y,
		modelTransZ: t_z,
		modelScaleX: s_x,
		modelScaleY: s_y,
		modelScaleZ: s_z,
		modelRotateX: r_x,
		modelRotateY: r_y,
		modelRotateZ: r_z,
	};
}
