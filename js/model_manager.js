function ModelManager(scene,camera) {
	SuperManager.call(this);

	this.scene=scene;
	this.camera=camera;


	this._loader={
		gltf:undefined,
        obj:undefined,
        fbx:undefined
	}

	this._selectObj=undefined;

	this.mixers=[];


//高亮的mesh列表
	this._highLights=[];

	//清理资源列表
	this.clears=new Map;

	this.getModel=function(id){
		if(!this.has(id)) return null;
		return this.getObject(id).scene;
	};

}

//原型继承
ModelManager.prototype = new SuperManager();
//将自身指针指向自己的构造函数
ModelManager.prototype.constructor = ModelManager;

//每帧更新参数
ModelManager.prototype.update = function(delta) {
	if (this.mixers&& this.mixers.length > 0 ) {
		for ( var i = 0; i < this.mixers.length; i ++ ) {

			this.mixers[ i ].update( delta);
		}
	}
}

function getExtension(url){
	return url.substring(url.lastIndexOf('.')+1);
}

// 添加一个模型
ModelManager.prototype.addModel = function(obj,initEffectParams,onProgress,onFinish,onError){
	if (!defined(obj.url))return undefined;	
	var scope=this;	
    if(scope.has(obj.id))return scope.getObject(obj.id);
    

    function loadModel(loader,obj,initEffectParams,onProgress,onFinish,onError){
        loader.load(obj.url, function( data ) {		
            obj.scene=data;
					
			obj.mixer = new THREE.AnimationMixer( obj.scene );
			scope.mixers.push( obj.mixer );

			if(data.animations.length > 0) {
				var action = obj.mixer.clipAction( data.animations[ 0 ] );
				action.play();
			}
            
            var initParams=initEffectParams||{};
    
            //设置初始位置
            var initPos=initParams.position;
            if(initPos){
                obj.scene.position.copy(initPos);
            }
            //产生阴影
            if(scope.castShadow){
                scope.setMeshShadow(obj.scene,true,true);
            }
    
            //设置模型材质效果
            if(initParams.materialEffect){
                scope.setModelMaterialEffect(obj.scene,initParams.materialEffect);
            }
               
            // 
            //计算物件包围球
            obj.boundingSphere=new THREE.Sphere();
            obj.boundingSphere.copy(scope.computeBoundingSphere(obj.scene));
            // var pos=new THREE.Vector3();
            // baseScene.camera.position.copy(obj.scene.getWorldPosition(pos));
            // baseScene.camera.position.y+=(bs.radius+9)*Math.sin(Math.PI/4);
            // baseScene.camera.position.z+=(bs.radius+10)*Math.cos(Math.PI/4);
    
			scope.add(obj.id,obj);
			
			if(initParams.parentNode){
				initParams.parentNode.add(obj.scene);
			}else{
				scope.scene.add(obj.scene);    
			}

              
    
    
            // //处理一些模型透明纹理丢失问题
            // if(initParams.transparentNode){
            //     const transparentNode=initParams.transparentNode;
            //     scope.setObjectAlphaColor(obj.id,transparentNode.transparent?transparentNode.transparent:0.2,
            //                                 undefined,undefined,transparentNode.nodes,undefined,false);
            // }
    
            //obj添加释放函数
            obj.removeSelf=function(){
                function disposeScene(o3d){
                    if(o3d instanceof THREE.Mesh){
                        //1、释放geometry
                        o3d.geometry.dispose();
                        //2、释放material
                        if (Array.isArray(o3d.material)) {
                            while(o3d.material.length>0){
                                var mat=o3d.material.pop();
                                //释放texture
                                if(mat.map instanceof THREE.Texture)
                                {
                                    mat.map.dispose();
                                }
                                mat.dispose();
                            }				
                        }else{
                            var mat=o3d.material;
                                //释放texture
                            if(mat.map instanceof THREE.Texture)
                            {
                                mat.map.dispose();
                            }
                            mat.dispose();
                        }
                    }else{
                        var children=o3d.children;
                        for (var i = 0; i < children.length; i++) {
                            var o=children[i];
                            disposeScene(o);
                        }
                    }
                }
                disposeScene(this.scene);
                
                if(this.modelInfo){
                    this.modelInfo=[];
                }
                if(this.baseScene)
                    this.baseScene=undefined;
                if(this.nodeNameMap)
                    this.nodeNameMap.clear();	
            }
            
            if(typeof onFinish ==="function"){
                onFinish(obj);
            }
            
        },onProgress,onError);
    }
    var ext=getExtension(obj.url).toLowerCase();
    if(ext==="gltf"||ext==="glb"){
		
	}else if(ext==="obj"){
		
	}else if(ext==="fbx"){
        if(this._loader.fbx){
            loadModel(this._loader.fbx,obj,initEffectParams,onProgress,onFinish,onError);
        }else{
            loadJs("js/libs/loaders/FBXLoader.js","fbx_loader",function(){
                var loader=new THREE.FBXLoader();
                scope._loader.fbx=loader;
                loadModel(loader,obj,initEffectParams,onProgress,onFinish,onError);
            });
        }
    }


	
}

// 移除一个模型
ModelManager.prototype.removeModel = function(id,onFinish,onError){
	var obj=this.getObject(id);
	if(!defined(obj))return false;
	var model=obj.scene;
	this._baseScene.scene.remove(model);
	//处理相关资源
	if(this.clears.has(obj.id)){
		var clear=this.clears.get(obj.id);
		if(clear instanceof Function){
			clear(obj);
		}else if(clear instanceof Map){
			var clearObj=clear.get(obj.id);
			clearObj.dispose(obj);
			clearObj=undefined;
			clear.delete(obj.id);
		}else if(clear instanceof Object){
			clear.dispose(obj);
			clear=undefined;
		}
	}
	this.remove(obj.id);	
	model=undefined;
}

// 模型、节点显影
ModelManager.prototype.showModel = function(id,bShow,nodeNames=undefined){
	var obj=this.getObject(id);
	if(!obj)return false;
	if(nodeNames&&nodeNames.length>0){
		for (var i = 0; i < nodeNames.length; i++) {
			var nodeName = nodeNames[i];
			var node=obj.scene.getObjectByName(nodeName);
			node.visible = bShow;
		}
	}else{
		obj.scene.visible = bShow;
	}
	
}



ModelManager.prototype.setModelMaterialEffect =function(model,materialParams){
	if (model instanceof THREE.Mesh){
		if ( Array.isArray( model.material)) {
			for (var j = 0; j < model.material.length; j++) {
				var mat=model.material[j];
				//修改材质中支持的参数
				for ( var property in materialParams) {
					if(defined(mat[property])){
						mat[property]=materialParams[property];
					}					
	
				}
			}				
		}else{
			//修改材质中支持的参数
			for ( var property in materialParams) {
				if(defined(model.material[property])){
					model.material[property]=materialParams[property];
				}					

			}
		}
	}else{
		var children=model.children;
		for (var i = 0; i < children.length; i++) {
			var o=children[i];
			this.setModelMaterialEffect(o,materialParams);
		}
	}	
}



//s1 合并s2
function combineSpere(s1,s2){

	var c1=s1.center,c2=s2.center;
	var r1=s1.radius,r2=s2.radius;
	var dis=c1.distanceTo(c2);
	if(dis<r1||dis<r2){
		if (r1<r2) 	s1.copy(s2);
	}else{
		var direction=new THREE.Vector3().subVectors(c2,c1).normalize();
		s1.center=new THREE.Vector3().addVectors(c1,direction.multiplyScalar((r1+r2+dis)/2-r1));
		s1.radius=(r1+r2+dis)/2;
	}
}
// obj必须是Object3D
ModelManager.prototype.computeBoundingSphere=function(obj){
	if (!(obj instanceof THREE.Object3D)) return undefined;
	var bs=new THREE.Sphere(obj.position.clone(),0.0);
	obj.getWorldPosition(bs.center);

	if (obj instanceof THREE.Mesh) {
		if(!defined(obj.geometry.boundingSphere)){
			obj.geometry.computeBoundingSphere();
		}
		var matrixWorld = obj.matrixWorld;		
		bs.copy(obj.geometry.boundingSphere);
		bs.applyMatrix4( matrixWorld );
		//取世界坐标
		//bs.center=obj.localToWorld(bs.center);
	}else{
		var children = obj.children;
		for ( var i = 0, l = children.length; i < l; i ++ ) {
			var s=this.computeBoundingSphere(children[i]);
			if(i==0){
				bs.copy(s);
			}else
				combineSpere(bs,s);
		}
	}
	return bs;
}

//内部调用 将obj中所有mesh push进meshArray
ModelManager.prototype._getMeshArray=function(meshArray,obj){
	if(obj instanceof THREE.Mesh){
		meshArray.push(obj);
	}else{
		var children=obj.children;
		for(var i=0;i<children.length;i++){
			this._getMeshArray(meshArray,children[i]);
		}
	}
}


ModelManager.prototype.setMeshShadow=function(o3d,castShadow,receiveShadow){
	if(o3d instanceof THREE.Mesh){
		var matNeedUpdate=false;
		if(castShadow!=o3d.castShadow){
			matNeedUpdate=true;
			o3d.castShadow = castShadow;
		}			
		if(receiveShadow!=o3d.receiveShadow){
			o3d.receiveShadow = receiveShadow;
			matNeedUpdate=true;
		}
		if ( Array.isArray( o3d.material)) {
			for (var j = 0; j < o3d.material.length; j++) {
				var mat=o3d.material[j];
				mat.needsUpdate=matNeedUpdate;				
			}				
		}else{
			o3d.material.needsUpdate=matNeedUpdate;				
		}
	}else{
		var children=o3d.children;
		for(var i=0;i<children.length;i++){
			this.setMeshShadow(children[i],castShadow,receiveShadow);
		}
	}
}


ModelManager.prototype._setMeshOutLine=function(obj,bNew=true){
	if(bNew) this._highLights=[];
	//开启场景postprocess模式
	var baseScene=this._baseScene;
	baseScene._postprocess=true;
	if(!defined(baseScene._outlinePass)){
		baseScene.enableOutline(true);
	}
	this._getMeshArray(this._highLights,obj);
	baseScene._outlinePass.selectedObjects=this._highLights;
}

//内部调用 设置mesh边框高亮 ，bNew是否重新创建高亮列表
ModelManager.prototype._setMeshOutLine=function(obj,bNew=true){
	if(bNew) this._highLights=[];
	//开启场景postprocess模式
	var baseScene=this._baseScene;
	baseScene._postprocess=true;
	if(!defined(baseScene._outlinePass)){
		baseScene.enableOutline(true);
	}
	this._getMeshArray(this._highLights,obj);
	baseScene._outlinePass.selectedObjects=this._highLights;
}
ModelManager.prototype.highlight=function(id,nodeName,bNew=true){
	var obj=this.getObject(id);
	if(!defined(obj))return false;
	var sceneObj=obj.scene;
	var scope=this;
	if (Array.isArray(nodeName)) {
		if(bNew) this._highLights=[];
		nodeName.forEach(function(name){
			var meshObj=sceneObj.getObjectByName(name);
			if(meshObj)scope._setMeshOutLine(meshObj,false);
		});		
	}else{
		var meshObj=sceneObj.getObjectByName(mesh);
		if(meshObj)scope._setMeshOutLine(meshObj,bNew);
	}	
}
ModelManager.prototype.clearHighlight=function(){
	this._highLights=[];
	var baseScene=this._baseScene;
	if(defined(baseScene._outlinePass)){
		baseScene._outlinePass.selectedObjects=[];
		baseScene.enableOutline(false);
	}	
}


function ascSort( a, b ) {

	return a.distance - b.distance;

}
ModelManager.prototype.rayPick= function(mouse) {
	var raycaster = new THREE.Raycaster();
	raycaster.setFromCamera( mouse, this.camera );
	var intersectObj=[];
	var intersects=[];
	for(var [id,obj] of this._collection){
		var model=obj.scene;
		if((model instanceof THREE.Object3D)&&model.visible==true){
			var intersect=raycaster.intersectObjects(model.children,true);
			if(intersect.length>0){
				//intersects.push(intersect);
				obj.distance=intersect[0].distance;
				intersects=intersects.concat(intersect);					
				intersectObj.push(obj);				
			}				
		}
	}
	intersects.sort(ascSort);
	intersectObj.sort(ascSort);
	this._selectObj=intersectObj[0];
	intersectObj=[];
	return intersects[0];
}


ModelManager.prototype.onLeftClick=function(mouse){
	if(!defined(this.currentShowModel))return null;
	this.restoreObjectAlphaColor(this.currentShowModel.id);
	if (this._bLeftClick==false){
		return null;
	}
	var baseScene=this._baseScene;

	var intersectobj=this.rayPick(mouse);
	//处理一下自动划分的子节点
	if(intersectobj&&intersectobj.object){		
		intersectobj.object=this._getParentNode(intersectobj.object);
		intersectobj.userObj=this._selectObj;	
	}		
	return intersectobj;
}

ModelManager.prototype.getObjectFromObj3D = function(o3d){
	if (o3d instanceof THREE.Scene) {
		for (var [id,obj] of this._collection) {
			if(obj.scene===o3d) return obj;
		}
	}else{
		if(!defined(o3d.parent)) return null;
		var mp=o3d.parent;
		return this.getObjectFromObj3D(mp);
	}

}

ModelManager.prototype.getObj3dFromNode= function(node){
	if (node instanceof THREE.Scene) {
		return node;
	}else{
		if(!defined(node.parent)) return null;
		var mp=node.parent;
		return this.getObj3dFromNode(mp);
	}
}

//获取节点世界坐标
ModelManager.prototype.getNodePositionByName=function(id,nodeName){
	if(!this.has(id)) return false;
	var obj=this.getObject(id);
	var sceneObj=obj.scene;
	var meshObj=sceneObj.getObjectByName(nodeName);
	if(meshObj)
		return meshObj.getWorldPosition();
	else	
		return null;

}
/****************************************************************************** */
//设置模型节点颜色效果
//获取一下模型材质引用，为后续对节点材质更改做准备
ModelManager.prototype.getNodeMaterial=function(obj,node,materials,bCopy=true){
	if(!obj.materialCount){
		obj.materialCount=new Map;
		function getAllMaterial(materialCount,mesh){
			if (mesh instanceof THREE.Mesh){
				if ( Array.isArray( mesh.material)) {
					for (var j = 0; j < mesh.material.length; j++) {
						var mat=mesh.material[j];
						if(!materialCount.has(mat)){
							materialCount.set(mat,1);
						}else{
							var count=materialCount.get(mat);
							count+=1;
							materialCount.set(mat,count);
						}						
					}				
				}else{
					if(!materialCount.has(mesh.material)){
						materialCount.set(mesh.material,1);
					}else{
						var count=materialCount.get(mesh.material);
						count+=1;
						materialCount.set(mesh.material,count);
					}					
				}
			}else{
				var children=mesh.children;
				for (var i = 0; i < children.length; i++) {
					var o=children[i];
					getAllMaterial(materialCount,o);
				}
			}	
		}
		getAllMaterial(obj.materialCount,obj.scene);
	}
	if (node instanceof THREE.Mesh){
		if ( Array.isArray( node.material)) {
			for (var j = 0; j < node.material.length; j++) {
				var mat=node.material[j];
				var count=obj.materialCount.get(mat);
				//材质引用次数大于1  则复制一下材质
				if(count>1&&bCopy){					
					obj.materialCount.set(mat,count-1);
					node.material[j]=mat.clone();
					obj.materialCount.set(node.material[j],1);
				}
				materials.push(node.material[j]);		
			}				
		}else{
			var count=obj.materialCount.get(node.material);
			//引用计数大于1
			if(count>1&&bCopy){
				obj.materialCount.set(node.material,count-1);
				node.material=node.material.clone();
				obj.materialCount.set(node.material,1);
			}
			materials.push(node.material);				
		}
	}else{
		var children=node.children;
		for (var i = 0; i < children.length; i++) {
			var o=children[i];
			if(typeof(o)=="string"){
				o=obj.scene.getObjectByName(o);
			}
			if(defined(o))
				this.getNodeMaterial(obj,o,materials);
		}
	}
}

//设置一个节点的透明 颜色
ModelManager.prototype.setNodeAlphaColor = function(obj,node,alpha=undefined,color=undefined,emissiveColor=undefined,bStroe=true){
	if (alpha==undefined&&color==undefined&&emissiveColor==undefined) return false;
	var nodeMaterials=[];
	this.getNodeMaterial(obj,node,nodeMaterials);

	for(var i=0;i<nodeMaterials.length;i++){
		var mat=nodeMaterials[i];
		//设置材质透明度
		if (alpha) {
			mat.transparent=true;
			//首次时备份一下
			if(!mat.opacity_origin){
				if(bStroe)
					mat.opacity_origin=mat.opacity;
				else{
					mat.opacity_origin=alpha;
					mat.transparent_all=true;
				}
					
			}				
			mat.opacity=alpha;
		}
		//设置颜色
		if(color){
			//首次时备份一下
			if(!mat.color_origin){
				if(bStroe)
					mat.color_origin=mat.color;
				else
					mat.color_origin=color;
			}				
			mat.color=color;
		}
		//设置蒙版色
		if(emissiveColor){
			//首次时备份一下
			if(!mat.emissive_origin){
				if(bStroe)
					mat.emissive_origin=mat.emissive;
				else
					mat.emissive_origin=emissiveColor;
			}				
			mat.emissive=emissiveColor;
		}
	}
}
ModelManager.prototype.restoreObjectAlphaColor=function(id,nodeName){
	var obj=this.getObject(id);
	if(!defined(obj))return false;
	var o3d;
	if(defined(nodeName)){
		o3d=obj.scene.getObjectByName(nodeName);
		if(!defined(o3d))return false;
	}else{
		o3d=obj.scene;
	}
	var nodeMaterials=[];
	this.getNodeMaterial(obj,o3d,nodeMaterials,false);
	for(var i=0;i<nodeMaterials.length;i++){
		var mat=nodeMaterials[i];
		//设置材质透明度
		if (mat.opacity_origin) {			
			mat.transparent=mat.transparent_all?true:false;
			mat.opacity=mat.opacity_origin;
		}
		//设置颜色
		if(mat.color_origin){
			mat.color=mat.color_origin;
		}
		//设置蒙版色
		if(mat.emissive_origin){
			mat.emissive=mat.emissive_origin;
		}
	}

	
}
ModelManager.prototype.setObjectAlphaColor=function(id,alpha=undefined,color=undefined,emissive=undefined,
													specialNodes=[],exceptNodes=[],bStroe=true){
	var obj=this.getObject(id);
	if(!defined(obj))return false;
	//指定mesh数组的话，只设置指定的，这时不考虑排除的
	if(specialNodes.length>0){
		for (var k = 0; k <specialNodes.length; k++) {
			//include数组大于0时默认所有不设置，匹配一个设置一个
			var n=specialNodes[k];
			var node=obj.scene.getObjectByName(n);
			if(node)
				this.setNodeAlphaColor(obj,node,alpha,color,emissive,bStroe);
		}	
	}else{
		var scope=this;
		function setAllNodeEffect(o3d,alpha,color,emissive,bStroe=true){
			if(o3d instanceof THREE.Mesh){
				scope.setNodeAlphaColor(obj,o3d,alpha,color,emissive,bStroe)
			}else{
				var children=o3d.children;
				for (var i = 0; i < children.length; i++) {
					setAllNodeEffect(children[i],alpha,color,emissive,bStroe);
				}
			}			
		}
		setAllNodeEffect(obj.scene,alpha,color,emissive,bStroe);		
		if(exceptNodes.length>0){
			var exceptGroup={};exceptGroup.children=[];
			for (var j = 0; j < exceptNodes.length; j++) {
				var nExcep=exceptNodes[j];
				exceptGroup.children.push(nExcep);
			}
			var exceptMaterials=[];
			scope.getNodeMaterial(obj,exceptGroup,exceptMaterials);
			for(var i = 0; i < exceptMaterials.length; i++) {
				var mat=exceptMaterials[i];
				//设置材质透明度
				if (mat.opacity_origin&&alpha) {
					mat.transparent=false;
					mat.opacity=mat.opacity_origin;
				}
				//设置颜色
				if(mat.color_origin&&color){
					mat.color=mat.color_origin;
				}
				//设置蒙版色
				if(mat.emissive_origin&&emissive){
					mat.emissive=mat.emissive_origin;
				}
			}
		}
	}

}
/****************************************************************************** */


/***********************************************************************************************************/
//物件自传 begin
ModelManager.prototype.addRotationObj= function(obj,rotation=true,rotationAxies=new THREE.Vector3(0,1,0),
												rotationSpeed=Math.PI/30,nodeName=undefined){
	var o3d=obj.scene;														
	if(typeof obj === 'string'){
		if(!this.has(obj)) return false;
		o3d=this.getObject(obj).scene;
		if (nodeName) {
			o3d=o3d.getObjectByName(nodeName);
		}
	}
	if(!this._rotationList.has(o3d.id)){
		var ro={};
		ro.o3d=o3d;
		ro.rotationAxies=rotationAxies;
		ro.rollSpeed=rotationSpeed;
		ro.bRotation=rotation;
		ro.originRotation=o3d.rotation;//保存初始旋转角度
		this._rotationList.set(o3d.id,ro);
	}
}

ModelManager.prototype.setRotationObjState= function(obj,rotation=true,rotationSpeed=Math.PI/30){
	var o3d=obj.scene;													
	if(typeof obj === 'string'){
		if(!this.has(obj)) return false;
		o3d=this.getObject(obj).scene;
		if (nodeName) {
			o3d=o3d.getObjectByName(nodeName);
		}
	}
	if(this._rotationList.has(o3d.id)){
		var ro=this._rotationList.get(o3d.id);
		ro.bRotation=rotation;
		ro.rollSpeed=rotationSpeed;
	}else{
		this.addRotationObj(obj);
	}
}
//
ModelManager.prototype.removeRotationObj= function(obj,nodeName=undefined){
	var o3d=obj.scene;													
	if(typeof obj === 'string'){
		if(!this.has(obj)) return false;
		o3d=this.getObject(obj).scene;
		if (nodeName) {
			o3d=o3d.getObjectByName(nodeName);
		}
	}
	if(this._rotationList.has(o3d.id)){
		var ro=this._rotationList.get(o3d.id);
		o3d.rotation.copy(ro.originRotation);
		this._rotationList.delete(o3d.id);
	}
}
//物件自传 end
/***********************************************************************************************************/

/***********************************************************************************************************/
//相机巡视物件 begin
ModelManager.prototype.patrolObject= function(obj,bPatrol,rotationSpeed=Math.PI/30){
	var _this = this;
	this.patrolEntity=undefined;
	var modelId=undefined;
	if(typeof obj === 'string'){
		if(!this.has(obj)) return false;
		modelId=obj;
		obj=this.getObject(obj);
	}
	if(!modelId){
		var modelId=this.getId(obj);
	}	
	this.patrolEntity={
		model:obj,
		bPatrol:bPatrol,
		patrolSpeed:rotationSpeed,
		infoList : []
	}
	//请求巡视数据
	if(this.patrolEntity.lastModel!=obj){
		if(obj.modelInfo){
			this.patrolEntity.infoList = obj.modelInfo.node_list;
		}
		// !(function(){
		// 	$.ajax({
		// 		type : "get",
		// 		url : "/web3d/data/patrol/"+modelId+".json",
		// 		success : function(data){
		// 			_this.patrolEntity.infoList = data;
		// 		}
		// 	});
		// })();
	}
	this.patrolEntity.lastModel=obj;
	
}

ModelManager.prototype.setPatrolState= function(bPatrol,rotationSpeed){

	if(this.patrolEntity){
		this.patrolEntity.bPatrol=bPatrol;
		this.patrolEntity.patrolSpeed=rotationSpeed;
	}
}
//
ModelManager.prototype.removePatrol= function(){
	this.patrolEntity=undefined;
}

//相机巡视物件 end
/***********************************************************************************************************/
//更改模型比例
ModelManager.prototype.changeScale= function(id,scaleX,scaleY,scaleZ){
	var object=this.getObject(id);
	if(!defined(object))return null;	
	if(scaleX==undefined)return null;	
	if(scaleY==undefined||scaleZ==undefined){
		scaleY=scaleZ=scaleX;
	}
	var scale=new THREE.Vector3(scaleX,scaleY,scaleZ);
	if(!object.scene.originScale)object.scene.originScale=object.scene.scale.clone();
	object.scene.scale.multiply(scale);
	if(scaleX==scaleY&&scaleX==scaleZ)
		object.boundingSphere.radius*=scaleX;
}
