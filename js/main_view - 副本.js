
//调用接口
var _viewObject = {
    //场景map
	scene:new THREE.Scene(),
	camera:new THREE.PerspectiveCamera( 45, 1920 / 768, 100, 500000 ),
	renderer : new THREE.WebGLRenderer({
		preserveDrawingBuffer: true,
//                    alpha: true,     //使透明度可以被修改
		antialias: true      //开启抗锯齿
	}),
	size:{
		width:1920,
		height:768
	},
	loadManager : new THREE.LoadingManager(),
	//模型管理
	modelManager:undefined,
    //初始化进度条框
    processes : undefined,
    //加载模型回调
    loadCallback:{
        onProgress:function (xhr) {
            if (xhr.lengthComputable) {
                var percentComplete = xhr.loaded / xhr.total * 100;
                _viewObject.processes.update(Math.round(percentComplete, 2) + "%", percentComplete>99?" Initializing...":"Loading...");
            }
        },        
        onFinish : function (obj) {
            _viewObject.processes.update("100%", "Scene is ready!");
            setTimeout(function () {
                _viewObject.processes.setVisible(false);
            }, 500);
			//处理外部回调
			var listener=_viewObject.listener.get("addModel");
			if(listener){
				var cb=listener.get(obj.url);
				if(cb)cb(obj);
				listener.delete(obj.url);
			}			
        },        
        onError : function (xhr) {
            _viewObject.processes.update("error", "check your internet!");
            setTimeout(function () {
                _viewObject.processes.setVisible(false);
            }, 3000);
        }
	},
	inputState:{
		isUserInteracting:false,
		rotationDelta:{
			x:0,
			y:0
		}
	},
    //事件回调
	listener:new Map(),
	//主刷新animate控制
	mainAnimate_startOrstop:true,

	isDebug:VIEW_MODE==='_RELEASE'?true:false,

};


function mainAnimate() {
	if(_viewObject.mainAnimate_startOrstop===false)return;
	window.setTimeout( function() { requestAnimationFrame(mainAnimate); }, 1000 / 25);
	//requestAnimationFrame(mainAnimate);
	_viewObject.render();
	if(_viewObject._stats){
		_viewObject._stats.update();
	}	
}


_viewObject.render = function () {
	//TWEEN.update();	
	var rotationDelta=_viewObject.inputState.rotationDelta;
	if(this.inputState.isUserInteracting === false) {
		rotationDelta.x += 0.1;
		checkDegree(rotationDelta.x);
	}
	_viewObject.gSphere.rotation.y = THREE.Math.degToRad(-rotationDelta.x);
	_viewObject.gSphere.rotation.x= THREE.Math.degToRad(-rotationDelta.y);
	var delta=_viewObject.clock.getDelta();
	if(_viewObject.modelManager)_viewObject.modelManager.update(delta);
	_viewObject.renderer.render( _viewObject.scene, _viewObject.camera );		
};

_viewObject.draw = function (startOrstop) {
	this.mainAnimate_startOrstop=startOrstop;
	if(startOrstop===true)
		mainAnimate();
};


_viewObject.loadManager.onError = function (item, loaded, total) {
    _viewObject.processes.update("出错", "请联系管理员！");
    setTimeout(function () {
        _viewObject.processes.setVisible(false);
    }, 3000);
};

_viewObject.onWindowResize = function () {

	_viewObject.camera.aspect = _viewObject.parentDom.offsetWidth/_viewObject.parentDom.offsetHeight;
	_viewObject.camera.updateProjectionMatrix();

	_viewObject.renderer.setSize( _viewObject.parentDom.offsetWidth, _viewObject.parentDom.offsetHeight );
};
_viewObject.onClick=function(event) {
	if(!_viewObject.mouseState.bClick)return false;
	var pos=new THREE.Vector2(event.offsetX,event.offsetY);
	if(event.target===_viewObject.rendererManager.renderObj._renderer.domElement){
		_viewObject.rendererManager.onLeftClick(pos);
	}else{
		var dom=event.target;
		if(dom.className==="css2drenderDom"){
			pos.x+=dom.offsetLeft;
			pos.y+=dom.offsetTop;
			_viewObject.rendererManager.onLeftClick(pos);
		}
	}
	
}


//添加一个模型
_viewObject.addModel = function (url, modelId,cb,initEffectParams,onProgress,onFinish,onError) {

	var modelManager=this.modelManager;

    var obj=modelManager.getObject(modelId);
    //场景已存在model
    if(defined(obj)){
        if(obj.scene.visible)
           _viewObject.processes.update("模型已加载过!", " ");
        else{
            obj.scene.visible=true;
        }            
        setTimeout(function () {
            processes.setVisible(false);
        }, 2000);
        return null;
    }
    var obj = {
        url: url,
        id: modelId
    }
    if(cb instanceof Function)
    {
		if(!_viewObject.listener.has("addModel")){
			var lisener=new Map;
			_viewObject.listener.set("addModel",lisener);
			lisener.set(url,cb);
		}else{
			var lisener=_viewObject.listener.get("addModel");
			if(!lisener.has(url)){
				lisener.set(url,cb);
			}
		}        
    }    
    modelManager.addModel( obj,initEffectParams,onProgress,onFinish,onError);    
}

_viewObject.remove = function (sceneId, modelId) {
    var baseScene=this.scenes.get(sceneId);
    if(!baseScene)return null;
    var modelManager=baseScene.modelManager;
    modelManager.removeModel(modelId);   
}




_viewObject.showLabel=function(sceneId,modelId,nodeName,bShow,divDom,offset=undefined,aniTime=500,bClearOther=true,cb){
    var baseScene=this.scenes.get(sceneId);
    if(!baseScene)return null;
    var labelManager=baseScene.labelManager;
    var modelManager=baseScene.modelManager;
    var model=modelManager.getModel(modelId);
    var node=model.getObjectByName(nodeName);
    if(!defined(node))return;
    var node_bs=new THREE.Sphere();
    try{
    	node_bs.copy(modelManager.calculateBoundingSphere(node));
    }catch(e){
        console.warn("没有找到node世界位置");
	}
	if(!offset){
		offset=modelManager.autoOffset(model,node_bs.center);
	}    
    //var offset=offset||new THREE.Vector3(0.4,0.4,0.5);
    var info=divDom||nodeName;
    labelManager.addPopLabel(nodeName,info,node_bs.center,offset,new THREE.Matrix4(),aniTime,bClearOther,cb);

}
_viewObject.hideAllLabel=function(sceneId){
    var baseScene=this.scenes.get(sceneId);
    if(!baseScene)return null;
    baseScene.labelManager.clearAllLabel()
}
_viewObject.highlight=function(sceneId, modelId,nodeName,bNew=true){
    var baseScene=this.scenes.get(sceneId);
    if(!baseScene)return null;
    var modelManager=baseScene.modelManager;
    modelManager.highlight(modelId,nodeName,bNew);
}
_viewObject.locateNode = function (sceneId, modelId, time, nodeName,bHighlight,cb) {
    var baseScene=this.scenes.get(sceneId);
    if(!baseScene)return null;
    var modelManager=baseScene.modelManager;
    modelManager.locateByName(modelId, nodeName,time, bHighlight,cb)
}

//draw
/*
var drawOptions={
    type:'cylinder',
    name:'RadarScanning',
    euler:{
        x:0,y:0,z:Math.PI/2
    },
    geometry:{
        radiusTop:0,
        radiusBottom:50,
        height:100,        
        radialSegments:25,
        heightSegments:5,
        openEnded:false,
        thetaStart:0,
        thetaLength:Math.PI*2,
        centerIsTop:true
    },
    material:{
        color:0xffffff,
        transparent:true,
        opacity:0.6,
        side:THREE.DoubleSide,
        emissive:0x072534
    },
    wireframe:{
        color:0xffffff,
        transparent:true,
        opacity:0.6,
    }
}
*/
_viewObject.addDrawObject = function (sceneId,modelId,meshName,drawID,drawOptions) {
    var baseScene=this.scenes.get(sceneId);
    if(!baseScene)return null;
    var model=baseScene.getModel(modelId);
    if(model==null) return;
    var mesh=model.getObjectByName(meshName);
    if(!mesh)mesh=model;
    var dM=baseScene.drawManager;
    if(dM){
        dM.addDrawObject(drawID,drawOptions.type,drawOptions.name,mesh,drawOptions);
    }
}

_viewObject.removeDrawObject = function (sceneId,drawID) {
    var baseScene=this.scenes.get(sceneId);
    if(!baseScene)return null;
    var dM=baseScene.drawManager;
    if(dM){
        dM.removeDrawObject(drawID);
    }
}
//dM.animateDraw(2,true,'scan',18)
_viewObject.animateDraw = function (sceneId,drawID,bPlay,type,duration) {
    var baseScene=this.scenes.get(sceneId);
    if(!baseScene)return null;
    var dM=baseScene.drawManager;
    if(dM){
        dM.animateDraw(drawID,bPlay,type,duration);
    }
}

//type:回调类型 type:"click"
_viewObject.addBaseSceneListener = function (sceneId,type,func) {
    var baseScene=this.scenes.get(sceneId);
    if(!baseScene)return null;
    baseScene.addListener(type,func);
}



//模型边框使能
_viewObject.enableOutline = function(enable){
	if (enable) {
		this._postprocess=true;
		if (!defined(this._composer)) {
			this._postprocess=true;
			this._composer = new THREE.EffectComposer( this.renderer );
			var renderPass = new THREE.RenderPass( this.scene, this.camera );
			this._composer.addPass( renderPass );
			this._outlinePass = new THREE.OutlinePass( new THREE.Vector2( this.size.width, this.size.height ), this.scene, this.camera );
			this._outlinePass.visibleEdgeColor.set(0x21f006);
			this._outlinePass.hiddenEdgeColor.set(0x18379d);
			this._outlinePass.renderToScreen=true;
			//闪烁
			this._outlinePass.pulsePeriod = 3;
			this._composer.addPass( this._outlinePass );
		}
	}else{
		this._postprocess=false;
	}
}


_viewObject.loadState = {
    loading: 0,
    loadSuccess: 1,
    downloadError: 2,
    loadError: 3,
}


function Processwindow() {
	var win = document.getElementById("process-window");
	if (!win) {
		var html = '<div id = "process-window" class="Absolute-Center"><div id = "animition"><div id = "percent"> 30%</div><div id ="round-picture"></div></div><div id = "text" style="padding: 10px;">loading...</div></div>';
		document.body.insertAdjacentHTML("beforeend", html);
		win = document.getElementById("process-window");
	}
	this.win = win;
	this.percent = document.getElementById("percent");
	this.text = document.getElementById("text");
	this.update = function (percent, text) {
		this.percent.innerText = percent;
		if (text) {
			this.text.innerText = text;
		}
		this.setVisible(true);
	};
	this.setVisible = function (bVisible) {
		this.win.style.display = bVisible ? "" : "none";
	};
	this.setVisible(false);
}

//初始化
$(function () {
	if ( ! Detector.webgl ) Detector.addGetWebGLMessage();
	_viewObject.processes=  new Processwindow();
	var container=document.getElementById("container");
	container.appendChild( _viewObject.renderer.domElement);
	_viewObject.parentDom=container;
	_viewObject.renderer.setPixelRatio( window.devicePixelRatio );
	_viewObject.renderer.setSize(container.offsetWidth, container.offsetHeight);
	//添加灯光
	var ambientLight = new THREE.AmbientLight( 0xffffff, 2);
	_viewObject.scene.add( ambientLight );

	light = new THREE.DirectionalLight( 0xffffff, 2 );
	light.position.set( 0, 0, -1 );

	_viewObject.scene.add( light );

	window.addEventListener( 'resize', _viewObject.onWindowResize, false );
	
	var sphere=new THREE.Object3D();
	sphere.name="sphere_group";
	_viewObject.scene.add(sphere);
	_viewObject.gSphere=sphere;
	_viewObject.onWindowResize();
	_viewObject.clock = new THREE.Clock();
	_viewObject.draw(true);
	//模型管理器
	var modelManager=_viewObject.modelManager;
	
	loadJs(["js/super_manager.js","js/model_manager.js"],undefined,function(){
		_viewObject.modelManager=new ModelManager(_viewObject.scene,_viewObject.camera);
		modelManager=_viewObject.modelManager;
		// var url="data/xingkongmianp/r2_sea_level.fbx";
		// var initEffectParams={
		// 	parentNode:sphere,
		// 	materialEffect:{
		// 		side:THREE.DoubleSide
		// 	}
		// }
		// _viewObject.addModel(url,"haipingmian",function(){
		// 	url="data/xingkongmianp/r5_colorful_background.fbx";
		// 	_viewObject.addModel(url,"huancaibejing",null,initEffectParams);
		// 	url="data/xingkongmianp/r6_galaxy.fbx";
		// 	_viewObject.addModel(url,"yinhe",null,initEffectParams);
		// 	url="data/xingkongmianp/r4_scattered_stars.fbx";
		// 	_viewObject.addModel(url,"scattered_stars",null,initEffectParams);
		// 	url="data/xingkongmianp/r3_constellation.fbx";
		// 	_viewObject.addModel(url,"constellation",null,initEffectParams);
		// },initEffectParams,_viewObject.loadCallback.onProgress,_viewObject.loadCallback.onFinish,_viewObject.loadCallback.onError);
		var loadList=[
			{
				url:"data/xingkongmianp/r2_sea_level.fbx",
				id:"海平面",
				initEffectParams:{
					parentNode:sphere,
					materialEffect:{
						side:THREE.DoubleSide
					}
				}
			},
			{
				url:"data/xingkongmianp/r3_constellation.fbx",
				id:"星座",
				initEffectParams:{
					parentNode:sphere,
					materialEffect:{
						side:THREE.DoubleSide
					}
				}
			},
			{
				url:"data/xingkongmianp/r4_scattered_stars.fbx",
				id:"杂星",
				initEffectParams:{
					parentNode:sphere,
					materialEffect:{
						side:THREE.DoubleSide
					}
				}
			},
			{
				url:"data/xingkongmianp/r5_colorful_background.fbx",
				id:"彩色背景",
				initEffectParams:{
					parentNode:sphere,
					materialEffect:{
						side:THREE.DoubleSide
					}
				}
			},
			{
				url:"data/xingkongmianp/r6_galaxy.fbx",
				id:"银河",
				initEffectParams:{
					parentNode:sphere,
					materialEffect:{
						side:THREE.DoubleSide
					}
				}
			}
		];
		modelManager.loadScene(loadList,function(ev){
			_viewObject.processes.update(Math.round(ev.percent, 2) + "%", ev.percent>99?" Initializing...":"Loading...");
		},function(){
			setTimeout(function () {
                _viewObject.processes.setVisible(false);
            }, 500);
			if(VIEW_MODE==='_DEBUG'){
				var output_info=[];
				for(var [id,object] of modelManager.collection){
					var o={
						id:id,
						url:object.url,
						sphere:object.boundingSphere
					}
					output_info.push(o);
				}
				var blob = new Blob([JSON.stringify(output_info)], { type: "" });
				saveAs(blob, "scene_model.json");
				_viewObject.processes.update("100%","Scene is ready!");
			}
		});

	})
	//更改模型比例
	function changeScale(object,scale){
		var s=new THREE.Vector3(scale,scale,scale);
		if(!object.scene.originScale)object.scene.originScale=object.scene.scale.clone();
		object.scene.scale.multiply(s);
		object.boundingSphere.radius*=scale;
	}

	var currentView="海平面";
	var objArr=new Array(3);

	
	var inputState=_viewObject.inputState;
	var rotationDelta=_viewObject.inputState.rotationDelta;
	var camera=_viewObject.camera;

	function zoom_in(){
		
		if(currentView==="海平面"){
			
			if(objArr[0]==undefined){
				objArr[0]=modelManager.getObject("海平面");
				objArr[0].maxRadius=objArr[0].boundingSphere.radius;
				objArr[0].minRadius=110;
			}
			
			if(objArr[0].boundingSphere.radius<objArr[0].maxRadius){
				camera.fov*=1.01;
				camera.updateProjectionMatrix();
				changeScale(objArr[0],1.11);
			}else{
				if(camera.fov<45){
					camera.fov*=1.01;
					camera.updateProjectionMatrix();
				}
			}
		}else if(currentView==="彩色背景"){
			
			if(objArr[1]==undefined){
				objArr[1]=modelManager.getObject("彩色背景");
				objArr[1].maxRadius=objArr[1].boundingSphere.radius;
				objArr[1].minRadius=550;
				camera.near=500;						
			}
			
			if(objArr[1].boundingSphere.radius<objArr[1].maxRadius){
				camera.fov*=1.01;
				camera.updateProjectionMatrix();
				changeScale(objArr[1],1.11);
			}else{						
				camera.fov=15;
				camera.near=100;
				camera.updateProjectionMatrix();
				currentView="海平面";
				objArr[0].scene.visible=true;
				objArr[1].scene.visible=true;
			
			}
		}else if(currentView==="银河"){
			if(objArr[2]==undefined){
				objArr[2]=modelManager.getObject("银河");
				objArr[2].maxRadius=objArr[2].boundingSphere.radius;
				objArr[2].minRadius=500;
			}
			if(objArr[2].boundingSphere.radius<objArr[2].maxRadius){
				camera.fov*=1.01;
				camera.updateProjectionMatrix();
				changeScale(objArr[2],1.11);
			}else{
				camera.fov=15;
				camera.near=500;
				currentView="彩色背景"
				camera.updateProjectionMatrix();
				objArr[1].scene.visible=true;
				objArr[0].scene.visible=true;
			}
		}
	}

	function zoom_out(){
		//
		if(currentView==="海平面"){
			if(objArr[0]==undefined){
				objArr[0]=modelManager.getObject("海平面");
				objArr[0].maxRadius=objArr[0].boundingSphere.radius;
				objArr[0].minRadius=110;
			}
			if(objArr[0].boundingSphere.radius>objArr[0].minRadius){
				camera.fov*=0.99;
				camera.near=100;
				camera.updateProjectionMatrix();
				changeScale(objArr[0],0.9);
			}else{
				if(camera.near<objArr[0].boundingSphere.radius){
					camera.near*=1.1;
					// if(camera.fov<45){
					// 	camera.fov+=0.1;
					// }
					camera.updateProjectionMatrix();
					
				}else{
					objArr[0].scene.visible=false;
					camera.fov=45;
					camera.updateProjectionMatrix();
					currentView="彩色背景";
				}
			}
		}else if(currentView==="彩色背景"){
			if(objArr[1]==undefined){
				objArr[1]=modelManager.getObject("彩色背景");
				objArr[1].maxRadius=objArr[1].boundingSphere.radius;
				objArr[1].minRadius=550;
				camera.near=500;						
			}
			if(objArr[1].boundingSphere.radius>objArr[1].minRadius){
				camera.fov*=0.99;
				camera.near=500;
				camera.updateProjectionMatrix();
				changeScale(objArr[1],0.9);
			}else{
				if(camera.near<objArr[1].boundingSphere.radius){
		
					camera.near*=1.1;
					// if(camera.fov<45){
					// 	camera.fov+=0.1;
					// }
					camera.updateProjectionMatrix();
					
				}else{
					objArr[1].scene.visible=false;
					camera.fov=45;
					camera.updateProjectionMatrix();
					currentView="银河";
				}
			}
		}else if(currentView==="银河"){
			
			if(objArr[2]==undefined){
				objArr[2]=modelManager.getObject("银河");
				objArr[2].maxRadius=objArr[2].boundingSphere.radius;
				objArr[2].minRadius=500;
			}
			if(objArr[2].boundingSphere.radius>objArr[2].minRadius){
				camera.fov*=0.99;
				camera.updateProjectionMatrix();
				changeScale(objArr[2],0.8);
			}
		}
	}

	function backOrigin(){
		modelManager.changeScale("海平面",1);
		modelManager.changeScale("彩色背景",1);
		modelManager.changeScale("银河",1);
		camera.near=100;
		camera.fov=45;
		camera.updateProjectionMatrix();
	}

	//注册事件

	_viewObject.inputEvent = new Hammer.Manager(container, {
		recognizers: [
			// RecognizerClass, [options], [recognizeWith, ...], [requireFailure, ...]
			[Hammer.Pan,{ direction: Hammer.DIRECTION_ALL }],
			[Hammer.Pinch, { enable: true }]
		]
	});
	
		
	//双击 Tap recognizer with minimal 2 taps
	_viewObject.inputEvent.add( new Hammer.Tap({ event: 'doubletap', taps: 2 }) );
	//单击 Single tap recognizer
	_viewObject.inputEvent.add( new Hammer.Tap({ event: 'singletap' }) );
	_viewObject.inputEvent.get('doubletap').recognizeWith('singletap');	
	_viewObject.inputEvent.get('singletap').requireFailure('doubletap');

	_viewObject.inputEvent.on("singletap", function(ev) {
		console.info(ev);
	});
	_viewObject.inputEvent.on("doubletap", function(ev) {
		inputState.isUserInteracting=true;
		backOrigin();
		setTimeout(function(){inputState.isUserInteracting=false;}, 1000);
	});

	_viewObject.inputEvent.on("pinchstart pinchend pinchcancel pinchin pinchout", function(ev) {
		
		switch (ev.type) {
			case "pinchstart":
				inputState.isUserInteracting=true;
				break;

			case "panend":
				inputState.isUserInteracting=false;
				break;
			case "pinchcancel":
				//alert(ev.type);
				inputState.isUserInteracting=false;
				break;
			//缩小
			case "pinchin":
				inputState.isUserInteracting=true;
				zoom_in();
				break;
			case "pinchout":
				inputState.isUserInteracting=true;
				zoom_out();
				break;
		}
	});
	_viewObject.inputEvent.on("press pressup", function(ev) {
		inputState.isUserInteracting=true;
		if(ev.type==='pressup'){
			inputState.isUserInteracting=false;
		}
	});

	//拖动屏幕事件
	_viewObject.inputEvent.on("panstart panmove panend pancancel", function(ev) {
		switch (ev.type) {
			case "panstart":
				inputState.isUserInteracting=true;
				//开始触摸点
				inputState.startTouchPoint={
					x:ev.center.x,
					y:ev.center.y
				};
				//触摸时旋转角
				inputState.startRotationPoint={
					x:rotationDelta.x,
					y:rotationDelta.y
				};
				break;
			case "panmove":

				if(inputState.isUserInteracting=== true) {
    
                    rotationDelta.x = (ev.center.x - inputState.startTouchPoint.x) * PAN_SPEED + inputState.startRotationPoint.x;
                    rotationDelta.y = (ev.center.y - inputState.startTouchPoint.y) * PAN_SPEED + inputState.startRotationPoint.y;
					checkDegree(rotationDelta.x);
                }				
				break;
			case "panend":
				inputState.isUserInteracting=false;
				break;
		}
	});


	// jquery 兼容的滚轮事件
	$(container).on("mousewheel DOMMouseScroll", function (e) {
		
		var delta = (e.originalEvent.wheelDelta && (e.originalEvent.wheelDelta > 0 ? 1 : -1)) ||  // chrome & ie
					(e.originalEvent.detail && (e.originalEvent.detail > 0 ? -1 : 1));              // firefox

		
		if (delta > 0) {
			zoom_out();
		} else if (delta < 0) {
			zoom_in();
		}
	});

})