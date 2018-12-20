/*
*管理对象的基类
*
*/

function SuperManager(){
	this.name =undefined ;
	
	this._collection=new Map();
	
}

SuperManager.prototype = {
	constructor:SuperManager,
	get collection(){
		return this._collection;
	},
	get size(){
        this._collection.size;
    },
    add:function(id,object){
        this._collection.set(id,object);
    },
    remove:function(id) {
        if(!defined(id)||!this._collection.has(id)){
            return;
        }
        var element = this._collection.get(id);
        //场景元素自行销毁
        element.removeSelf();	
        //删除图层中的逻辑元素
        this._collection.delete(id);
    },
    //是否存在元素
    has:function(id) {
        return this._collection.has(id);
    },

}


//删除所有元素
SuperManager.prototype.removeAll = function() {
	this._collection.forEach(function(item){
		//场景元素自行销毁
		item.removeSelf();
	});
	//清空图层中的逻辑元素
	this._collection.clear();
}

//获取元素
SuperManager.prototype.getObject= function(id) {
	if(this._collection.has(id))
		return this._collection.get(id);
	else
		return null;
}

//由obj获取元素ID
SuperManager.prototype.getId = function(object) {
	for (var [key,value] of this._collection) {
		if(value===obj)	return key;
	}
	return null;
}

