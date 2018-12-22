
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
                _viewObject.processes.update(Math.round(percentComplete, 2) + "%", percentComplete>99?"正在解析模型，请稍等...":"正在下载模型...");
            }
        },        
        onFinish : function (obj) {
            _viewObject.processes.update("100%", "下载完成");
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
            _viewObject.processes.update("出错", "下载模型失败,请检查网络！");
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



//数据管理器
// _viewObject.loadManager.onProgress = function (item, loaded, total) {
//     // console.log( item, loaded, total );
//     var percent = Math.round(loaded / total * 100, 2);
//     if (percent == 100 && total != 1) {
//         percent = 99;
//         // processes.setVisible(false);
//     }
//     processes.update(percent + "%", "正在加载模型...");
// };

_viewObject.render = function () {
	//TWEEN.update();	
	var rotationDelta=_viewObject.inputState.rotationDelta;
	if(this.inputState.isUserInteracting === false) {
		rotationDelta.y += 0.1;
		checkDegree(rotationDelta.y);
	}
	_viewObject.gSphere.rotation.y = THREE.Math.degToRad(-rotationDelta.y);
	_viewObject.gSphere.rotation.x = THREE.Math.degToRad(-rotationDelta.x);
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
_viewObject.mouseDown=function(event) {

	event.preventDefault();
	// var pos=new THREE.Vector2(event.clientX,event.clientY);
	var pos = new THREE.Vector2(event.offsetX, event.offsetY);
	_viewObject.mouseState.lastPosition.x=pos.x;
	_viewObject.mouseState.lastPosition.y=pos.y;
	_viewObject.mouseState.bClick=true;
}
_viewObject.mouseUp=function(event) {

	event.preventDefault();
	// var pos=new THREE.Vector2(event.clientX,event.clientY);
	var pos = new THREE.Vector2(event.offsetX, event.offsetY);
	_viewObject.mouseState.position.x=pos.x;
	_viewObject.mouseState.position.y=pos.y;
	var lastPos=_viewObject.mouseState.lastPosition;
	if(Math.abs(pos.x-lastPos.x)>5||Math.abs(pos.y-lastPos.y)>5)
	{
		_viewObject.mouseState.bClick=false;
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


_viewObject.setShow = function (sceneId, modelId, visible) {
    var baseScene=this.scenes.get(sceneId);
    if(!baseScene)return null;
    var modelManager=baseScene.modelManager;
    modelManager.showModel(modelId, visible);
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
//播放节点动画
/*
sceneId：场景索引
modelID：添加模型时给的模型ID
node：节点名称/三维节点对象
play：播放或者停止
loop：播放次数
*/
_viewObject.playNodeAction = function(sceneId,modelId,nodeName, startTime, endTime, play = true, loop = 2,timeIsFrameNums=false){
    var baseScene=this.scenes.get(sceneId);
    if(!baseScene)return null;
    if(baseScene&&baseScene.animationCtrlMap.has(modelId)){
        var animationCtrl=baseScene.animationCtrlMap.get(modelId);
        animationCtrl.playNodeAction(nodeName,play,loop,startTime, endTime,timeIsFrameNums);
    }
    
}
_viewObject.playAction = function (sceneId, modelId, actionName, startTime, endTime, play = true, loop = 2) {
    var baseScene=this.scenes.get(sceneId);
    if(!baseScene)return null;
    if (baseScene && baseScene.animationCtrlMap.has(modelId)) {
        var animationCtrl = baseScene.animationCtrlMap.get(modelId);
        animationCtrl.playAction(actionName, play, loop, startTime, endTime);
    }

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
		var html = '<div id = "process-window" class="Absolute-Center"><div id = "animition"><div id = "percent"> 30%</div><div id ="round-picture"></div></div><div id = "text" style="padding: 10px;">正在加载 拉森号 </div></div>';
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
	_viewObject.draw(true);
	//模型管理器
	var modelManager=_viewObject.modelManager;
	loadJs(["js/super_manager.js","js/model_manager.js"],undefined,function(){
		_viewObject.modelManager=new ModelManager(_viewObject.scene,_viewObject.camera);
		modelManager=_viewObject.modelManager;
		var url="data/xingkongmianp/haipingmian.FBX";
		var initEffectParams={
			parentNode:sphere,
			materialEffect:{
				side:THREE.DoubleSide
			}
		}
		_viewObject.addModel(url,"haipingmian",function(){
			url="data/xingkongmianp/huancaibejing.FBX";
			_viewObject.addModel(url,"huancaibejing",null,initEffectParams);
			url="data/xingkongmianp/yinhe.FBX";
			_viewObject.addModel(url,"yinhe",null,initEffectParams);
		},initEffectParams,_viewObject.loadCallback.onProgress,_viewObject.loadCallback.onFinish,_viewObject.loadCallback.onError);
		
	})
	//更改模型比例
	function changeScale(object,scale){
		var s=new THREE.Vector3(scale,scale,scale);
		if(!object.scene.originScale)object.scene.originScale=object.scene.scale.clone();
		object.scene.scale.multiply(s);
		object.boundingSphere.radius*=scale;
	}

	var currentView="haipingmian";
	var objArr=new Array(3);
	//注册事件
	
	_viewObject.inputEvent = new Hammer.Manager(container, {
		recognizers: [
			// RecognizerClass, [options], [recognizeWith, ...], [requireFailure, ...]
			[Hammer.Tap],
			[Hammer.Press],
			[Hammer.Pan,{ direction: Hammer.DIRECTION_ALL }],
			[Hammer.Pinch, { enable: true }],
			[Hammer.Swipe,{ direction: Hammer.DIRECTION_ALL }],
		]
	});

	var inputState=_viewObject.inputState;
	var rotationDelta=_viewObject.inputState.rotationDelta;
	var camera=_viewObject.camera;
	_viewObject.inputEvent.on("pinchstart pinchmove pinchend pinchcancel pinchin pinchout", function(ev) {
		
		switch (ev.type) {
			case "pinchstart":
				inputState.isUserInteracting=true;

				break;
			case "panmove":
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
				//里层球到眼前10时看外层球
				if(currentView==="haipingmian"){
					
					if(objArr[0]==undefined){
						objArr[0]=modelManager.getObject("haipingmian");
						objArr[0].maxRadius=objArr[0].boundingSphere.radius;
						objArr[0].minRadius=110;
					}
					objArr[0].scene.visible=true;
					if(objArr[0].boundingSphere.radius<objArr[0].maxRadius){
						camera.fov+=0.08;
						camera.updateProjectionMatrix();
						changeScale(objArr[0],1.02);
					}else{
						
					}
				}else if(currentView==="huancaibejing"){
					
					if(objArr[1]==undefined){
						objArr[1]=modelManager.getObject("huancaibejing");
						objArr[1].maxRadius=objArr[1].boundingSphere.radius;
						objArr[1].minRadius=200;
						camera.near=200;						
					}
					objArr[1].scene.visible=true;
					if(objArr[1].boundingSphere.radius<objArr[1].maxRadius){
						camera.fov+=0.08;
						camera.updateProjectionMatrix();
						changeScale(objArr[1],1.02);
					}else{						
						camera.fov=15;
						camera.near=10;
						camera.updateProjectionMatrix();
						currentView="haipingmian";
					
					}
				}else if(currentView==="yinhe"){
					if(objArr[2]==undefined){
						objArr[2]=modelManager.getObject("yinhe");
						objArr[2].maxRadius=objArr[2].boundingSphere.radius;
						objArr[2].minRadius=500;
					}
					if(objArr[2].boundingSphere.radius<objArr[2].maxRadius){
						camera.fov+=0.08;
						camera.updateProjectionMatrix();
						changeScale(objArr[2],1.01);
					}else{
						camera.fov=15;
						camera.near=200;
						currentView="huancaibejing"
						camera.updateProjectionMatrix();
					}
				}
				break;
			case "pinchout":
				inputState.isUserInteracting=true;
				//里层球到眼前10时看外层球
				if(currentView==="haipingmian"){
					if(objArr[0]==undefined){
						objArr[0]=modelManager.getObject("haipingmian");
						objArr[0].maxRadius=objArr[0].boundingSphere.radius;
						objArr[0].minRadius=110;
					}
					if(objArr[0].boundingSphere.radius>objArr[0].minRadius){
						camera.fov-=0.08;
						camera.near=100;
						camera.updateProjectionMatrix();
						changeScale(objArr[0],0.98);
					}else{
						if(camera.near<objArr[0].boundingSphere.radius){
							camera.near+=0.2;
							// if(camera.fov<45){
							// 	camera.fov+=0.1;
							// }
							camera.updateProjectionMatrix();
							
						}else{
							camera.fov=45;
							camera.updateProjectionMatrix();
							currentView="huancaibejing";
						}
					}
				}else if(currentView==="huancaibejing"){
					objArr[0].scene.visible=false;
					if(objArr[1]==undefined){
						objArr[1]=modelManager.getObject("huancaibejing");
						objArr[1].maxRadius=objArr[1].boundingSphere.radius;
						objArr[1].minRadius=200;
						camera.near=200;
						objArr[0].scene.visible=false;
					}
					if(objArr[1].boundingSphere.radius>objArr[1].minRadius){
						camera.fov-=0.08;
						camera.near=200;
						camera.updateProjectionMatrix();
						changeScale(objArr[1],0.98);
					}else{
						if(camera.near<objArr[1].boundingSphere.radius){
							camera.near+=0.5;
							// if(camera.fov<45){
							// 	camera.fov+=0.1;
							// }
							camera.updateProjectionMatrix();
							
						}else{
							camera.fov=45;
							camera.updateProjectionMatrix();
							currentView="yinhe";
						}
					}
				}else if(currentView==="yinhe"){
					objArr[1].scene.visible=false;
					if(objArr[2]==undefined){
						objArr[2]=modelManager.getObject("yinhe");
						objArr[2].maxRadius=objArr[2].boundingSphere.radius;
						objArr[2].minRadius=500;
					}
					if(objArr[2].boundingSphere.radius>objArr[2].minRadius){
						camera.fov-=0.08;
						camera.updateProjectionMatrix();
						changeScale(objArr[2],0.98);
					}
				}
				break;
		}
	});
	_viewObject.inputEvent.on("press pressup", function(ev) {
		inputState.isUserInteracting=true;
		if(ev.type==='pressup'){
			inputState.isUserInteracting=false;
		}
	});
	_viewObject.inputEvent.on("swipe", function(ev) {
		alert(ev.type);
	});

	//拖动屏幕事件
	_viewObject.inputEvent.on("pan panstart panleft panright pandown panup panmove panend pancancel", function(ev) {
		switch (ev.type) {
			case "panstart":
				inputState.isUserInteracting=true;
				break;
			case "panup":
				inputState.isUserInteracting=true;
				rotationDelta.x-=PAN_SPEED;
				checkDegree(rotationDelta.x);
				break;
			case "pandown":
				inputState.isUserInteracting=true;
				rotationDelta.x+=PAN_SPEED;
				checkDegree(rotationDelta.x);
				break;
			case "panright":
				inputState.isUserInteracting=true;
				rotationDelta.y+=PAN_SPEED;
				checkDegree(rotationDelta.y);
				break;
			case "panleft":
				inputState.isUserInteracting=true;
				rotationDelta.y-=PAN_SPEED;
				checkDegree(rotationDelta.y);
				break;
			case "panend":
				inputState.isUserInteracting=false;
				break;
		}
	});
	
})