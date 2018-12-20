var camera, scene, renderer;
var aiGroup, aiArray = [],
	aiTheta = [],
	aiMap = [];
	aiMapBig = [];
var gCenterMaterial, gCenterSprite, gActiveIndex = 0;
var gGuangMat = [];

var isUserInteracting = false,
	onMouseDownMouseX = 0,
	onMouseDownMouseY = 0,
	lon = 0,
	onMouseDownLon = 0,
	lat = -60,
	onMouseDownLat = 0;

init();
animate();

function init() {

	var container, mesh;

	container = document.getElementById('container');
	scene = new THREE.Scene();

	camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerWidth, 1, 1100);
	camera.target = new THREE.Vector3(0, 0, 0);
	camera.position.z = 200;
	camera.position.y = 10;
	scene.add(camera);

	var objRoot = new THREE.Object3D();

	var objContainer = new THREE.Object3D();
	var textureLoader = new THREE.TextureLoader();
	objRoot.add(objContainer);
	scene.add(objRoot);

	//objRoot.scale.set(1, 0.3, 1.0);
	var geometry, material;
	objContainer.scale.set(0.15, 0.15, 0.15);
	//objContainer.rotation.x = Math.PI/8;

	{
        //lat = 0;
        var gzContainer = new THREE.Object3D();
        objContainer.add(gzContainer);



        for(var i=0; i<8; i++) {
			geometry = new THREE.PlaneBufferGeometry(135/4, 730/2, 4, 4); // x- axis

            material = new THREE.MeshBasicMaterial({map: textureLoader.load("/"+actCode+'/static/img/guangzhu'+i%5+'.png'), transparent: true, opacity: (i+1)%2 * 0.7+0.1});
            gGuangMat[i] = material;

			var gzObj = new THREE.Mesh(geometry, material);
			var gzPosParent = new THREE.Object3D();
            var gzRotParent = new THREE.Object3D();
            gzRotParent.add(gzObj);

            gzPosParent.add(gzRotParent);
			gzContainer.add(gzPosParent);

            gzRotParent.rotation.x = Math.PI / 2; // 6
            gzRotParent.rotation.y = -i*Math.PI/4;


            gzPosParent.position.x = 737/2 * Math.sin(i*Math.PI/4);
            gzPosParent.position.y = 737/2 * Math.cos(i*Math.PI/4);

            gzObj.rotation.x = -Math.PI / 6; // 6
    	}

        new TWEEN.Tween({opacity: 0.8}).to({opacity: 0.1}, 2000)
            .repeat(Infinity)
			.yoyo(true)
            .onUpdate(function(argc) {
            	for (var i=0; i<8; i++) {
            		if(i%2 == 0) {
            			gGuangMat[i].opacity = argc.opacity;
                    }
				}
            }).start();
        new TWEEN.Tween({opacity: 0.1}).to({opacity: 0.8}, 2000)
            .repeat(Infinity)
            .yoyo(true)
            .onUpdate(function(argc) {
                for (var i=0; i<8; i++) {
                    if(i%2 == 1) {
                        gGuangMat[i].opacity = argc.opacity;
                    }
                }
            }).start();

        // geometry = new THREE.PlaneBufferGeometry(135, 730, 4, 4); // x+ axis
        // material = new THREE.MeshBasicMaterial({map: textureLoader.load("/"+actCode+'/static/img/guangzhu1.png'), transparent: true});
        // var gzObj = new THREE.Mesh(geometry, material);
        // gzObj.rotation.x = Math.PI / 2;
        // gzObj.rotation.y = -Math.PI / 2;
        // //gzObj.rotation.z = -Math.PI / 6;
        // gzObj.position.x = 737/2;
        // gzContainer.add(gzObj);
        //
        // geometry = new THREE.PlaneBufferGeometry(135, 730, 4, 4);
        // material = new THREE.MeshBasicMaterial({map: textureLoader.load("/"+actCode+'/static/img/guangzhu1.png'), transparent: true});
        // var gzObj = new THREE.Mesh(geometry, material);
        // gzObj.rotation.x = Math.PI / 2;
        // gzObj.position.y = 737/2;
        // gzContainer.add(gzObj);
	}

	geometry = new THREE.PlaneBufferGeometry(737, 742, 4, 4);
	material = new THREE.MeshBasicMaterial({
		map: textureLoader.load("/"+actCode+'/static/img/article.png'),
		transparent: true
	});
	var objArticle = new THREE.Mesh(geometry, material);
	objContainer.add(objArticle);

	geometry = new THREE.PlaneBufferGeometry(588, 588, 4, 4);
	material = new THREE.MeshBasicMaterial({
		map: textureLoader.load("/"+actCode+'/static/img/cir2.png'),
		transparent: true,
		depthTest: false
	});
	var objCir2 = new THREE.Mesh(geometry, material);
	objContainer.add(objCir2);

	var geometry = new THREE.PlaneBufferGeometry(528, 528, 4, 4);
	var material = new THREE.MeshBasicMaterial({
		map: textureLoader.load("/"+actCode+'/static/img/cir1.png'),
		transparent: true,
		depthTest: false
	});
	var objCir1 = new THREE.Mesh(geometry, material);
	objContainer.add(objCir1);

	var ta = new TWEEN.Tween({
			theta: 0
		}).to({
			theta: 2 * Math.PI
		}, 6000)
		.repeat(Infinity)
		.onUpdate(function(argc) {
			objCir2.rotation.z = argc.theta;
		}).start();

	var tb = new TWEEN.Tween({
			theta: 0
		}).to({
			theta: -2 * Math.PI
		}, 6000)
		.repeat(Infinity)
		.onUpdate(function(argc) {
			objCir1.rotation.z = argc.theta;
		}).start();

	var spriteArray = [2 * Math.PI / 7 * 5 + 2 * Math.PI / 7 * 0.25,
		2 * Math.PI / 7 * 6 + 2 * Math.PI / 7 * 0.25,
		2 * Math.PI / 7 * 7 + 2 * Math.PI / 7 * 0.25,

		2 * Math.PI / 7 * 1 + 2 * Math.PI / 7 * 0.25,
		2 * Math.PI / 7 * 2 + 2 * Math.PI / 7 * 0.25,
		2 * Math.PI / 7 * 3 + 2 * Math.PI / 7 * 0.25,
		2 * Math.PI / 7 * 4 + 2 * Math.PI / 7 * 0.25
	];
	var idxArray = [4, 3, 2, 1, 7, 6, 5];
	//              视频 医疗 广告 识别             驾驶 交互 文化
	aiTheta = [360 / 7 * 0, 360 / 7 * 1, 360 / 7 * 2, 360 / 7 * 3, 360 / 7 * 4, 360 / 7 * 5, 360 / 7 * 6];
	//        lat = 0;
	for(var i = 0; i < 7; i++) {
		var group = new THREE.Object3D();
		group.position.set(380 * Math.cos(spriteArray[i]), 380 * Math.sin(spriteArray[i]), 0);
		aiArray[i] = group;

		material = new THREE.SpriteMaterial({
			map: textureLoader.load("/"+actCode+'/static/img/tab' + idxArray[i] + '.png'),
			transparent: true,
			depthTest: false
		});
		var spriteAct1 = new THREE.Sprite(material);
		spriteAct1.scale.set(188, 64, 1);
		spriteAct1.position.set(0, 64 / 2 + 90 / 2, 0);
		spriteAct1.center.set(0.5, 0.5);

		aiMap[i] = textureLoader.load("/"+actCode+'/static/img/' + idxArray[i] + '.png');
        //centerMap[i] = textureLoader.load("/"+actCode+'/static/img/act-' + idxArray[i] + '.png');
		material = new THREE.SpriteMaterial({
			map: aiMap[i],
			transparent: true,
			depthTest: false
		});
		var spriteAct2 = new THREE.Sprite(material);
		spriteAct2.scale.set(90, 90, 1);
		spriteAct2.center.set(0.5, 0.5);
		
		
		aiMapBig[i] = textureLoader.load("/"+actCode+'/static/img/act-' + idxArray[i] + '.png');
		material = new THREE.SpriteMaterial({
			map: aiMapBig[i],
			transparent: true,
			depthTest: false
		});
		var spriteAct3 = new THREE.Sprite(material);
		spriteAct3.scale.set(90, 90, 1);
		spriteAct3.center.set(0.5, 0.5);
		
		group.add(spriteAct1);
		group.add(spriteAct2);
		group.add(spriteAct3);
		
		objContainer.add(group);
	}
	aiGroup = objRoot;

	gCenterMaterial = new THREE.SpriteMaterial({
		map: aiMapBig[0],
		transparent: true,
		depthTest: false
	});
	gCenterSprite = new THREE.Sprite(gCenterMaterial);
	gCenterSprite.scale.set(400, 400, 1);
	gCenterSprite.center.set(0.5, 0.5);
	objContainer.add(gCenterSprite);

	updateScale();

	renderer = new THREE.WebGLRenderer({
		preserveDrawingBuffer: true,
		alpha: true, //使透明度可以被修改
		antialias: true //开启抗锯齿
	});
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setClearColor(0xffffff, 0);
	renderer.setSize(window.innerWidth, window.innerWidth);
	container.appendChild(renderer.domElement);

	document.addEventListener('mousedown', onPointerStart, false);
	document.addEventListener('mousemove', onPointerMove, false);
	document.addEventListener('mouseup', onPointerUp, false);

	document.addEventListener('touchstart', onPointerStart, false);
	document.addEventListener('touchmove', onPointerMove, false);
	document.addEventListener('touchend', onPointerUp, false);

	window.addEventListener('resize', onWindowResize, false);
}

function animate() {
	requestAnimationFrame(animate);
	update();
}

function update() {
	if(isUserInteracting === false) {
		lon += 0.1;
		if(lon < 0) {
			lon += 360;
		} else if(lon > 360) {
			lon -= 360;
		}
		updateScale();
	}
	aiGroup.rotation.z = THREE.Math.degToRad(lon);
	aiGroup.rotation.x = THREE.Math.degToRad(lat);

	TWEEN.update();
	renderer.render(scene, camera);
}

function onPointerStart(event) {

	isUserInteracting = true;

	var clientX = event.clientX || event.touches[0].clientX;
	var clientY = event.clientY || event.touches[0].clientY;

	onMouseDownMouseX = clientX;
	onMouseDownMouseY = clientY;

	onMouseDownLon = lon;
	onMouseDownLat = lat;

	var raycaster = new THREE.Raycaster();
	var mouse = new THREE.Vector2();

	{
        var object = document.getElementById("container");
		{
            var position = {};
            position.x = object.offsetLeft;
            position.y = object.offsetTop;

            while (object.offsetParent) {
                position.x = position.x + object.offsetParent.offsetLeft;
                position.y = position.y + object.offsetParent.offsetTop;

                if (object == document.getElementsByTagName("body")[0]) {
                    break;
                }
                else {
                    object = object.offsetParent;
                }
            }

            var scroll_top = document.documentElement.scrollTop || document.body.scrollTop;
            mouse.x = ((clientX-position.x) / window.innerWidth) * 2 - 1;
            mouse.y = -((clientY-position.y+scroll_top) / window.innerWidth) * 2 + 1;
        }
	}
	raycaster.setFromCamera(mouse, camera);
	var intersects = raycaster.intersectObject(gCenterSprite);
	if(intersects != null&&intersects.length>0) {
		aiCenterCallback(gActiveIndex);
	}
}

function onPointerMove(event) {
	if(isUserInteracting === true) {
		var clientX = event.clientX || event.touches[0].clientX;
		var clientY = event.clientY || event.touches[0].clientY;

		lon = (clientX - onMouseDownMouseX) * 0.2 + onMouseDownLon;
		lat = (clientY - onMouseDownMouseY) * 0.2 + onMouseDownLat;
		if(lat < -80)
			lat = -80;
		else if(lat > -45)
			lat = -45;

		if(lon < 0) {
			lon += 360;
		} else if(lon > 360) {
			lon -= 360;
		}

		updateScale();
	}
}

function onPointerUp(event) {
	isUserInteracting = false;
}

function updateScale() {
	//console.log("liuzx idx --------------------------------------------");
	var delta = 360 / 7;

	for(var i = 0; i < 7; i++) {
		var dt_lon = aiTheta[i] + lon;
		if(dt_lon > 360)
			dt_lon -= 360;
		else if(dt_lon < 0)
			dt_lon += 360;

		var scale = 1.0;
		//var idxArray = [4, 3, 2, 1,                   7, 6, 5];
		//console.log("liuzx idx "+i+"  dt_lon "+dt_lon+"  360-delta/2 "+ (360-delta/2));
		aiArray[i].children[1].visible = true;
				aiArray[i].children[2].visible = false;
		if(dt_lon < delta / 2) {
			scale = 1.0 + 2.0 * (delta / 2 - dt_lon) / delta / 2;

			if(dt_lon < delta / 6) {
				if(gActiveIndex != i) {
					gActiveIndex = i;
					gCenterMaterial.map = aiMapBig[gActiveIndex];
					//aiCenterCallback(gActiveIndex);
				}

				aiArray[i].children[1].visible = false;

			}
		} else if(dt_lon > 360 - delta / 2) {
			scale = 1.0 + 2.0 * (dt_lon - 360 + delta / 2) / delta / 2;

			if(dt_lon > 360 - delta / 6) {
				if(gActiveIndex != i) {
					gActiveIndex = i;
					gCenterMaterial.map = aiMapBig[gActiveIndex];
					//aiCenterCallback(gActiveIndex);
				}
				aiArray[i].children[1].visible = false;

			}
		}
		aiArray[i].scale.set(scale, scale, scale);
	}
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerWidth;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerWidth);
}

function aiCenterCallback(ai_id) {
	// 0 视频 1 医疗 2 广告 3 识别 4 驾驶 5 交互 6 文化
	//      console.log("liuzx aiCenterCallback ai_id " + ai_id);
	//if(ai_id == 0 || ai_id == 1 || ai_id == 2 || ai_id == 3 || ai_id == 4 || ai_id == 5 || ai_id == 6) {
	if(ai_id == 0) {
		$("#videoCont").show();
		$("body,html").css("overflow", "hidden");
		aiVideo.play();
	}
}