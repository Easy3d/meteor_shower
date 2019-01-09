function defaultValue(a, b) {
    if (a !== undefined && a !== null) {
        return a;
    }
    return b;
}

function defined(value) {
    return value !== undefined && value !== null;
}

const PAI = 3.1415926;

const LOW_LINE = '_';


function loadCss(url,id) {
    var head = document.getElementsByTagName('head')[0];
    if(Array.isArray(url)){
        for(var i=0;i<url.length;i++){
            var link = document.createElement('link');
            link.type='text/css';
            link.rel = 'stylesheet';
            link.href = url[i];
            head.appendChild(link);
        }
    }else{        
        var link = document.createElement('link');
        if(id)
            link.id=id;
        link.type='text/css';
        link.rel = 'stylesheet';
        link.href = url;
        head.appendChild(link);
    }
    
}


function loadJs(url,id,callback){
     var script=document.createElement('script');
     script.type="text/javascript";
    if(Array.isArray(url)&&url.length==1){
        url=url[0];
    }
    var head = document.getElementsByTagName('head')[0];
    if(Array.isArray(url)){
        var uri=url.splice(0,1);
        script.src=uri[0];
       
        head.appendChild(script);        
         if(script.readyState){
             script.onreadystatechange=function(){
              if(script.readyState == "loaded" || script.readyState == "complete"){
                  script.onreadystatechange=null;
                loadJs(url,null,callback);
              }
             }
         }else{
             script.onload=function(){
                  loadJs(url,null,callback);
             }
         }
    }else{
        if(id)
            script.id=id;
        script.src=url;
        if(typeof(callback)!="undefined"){
             if(script.readyState){
                 script.onreadystatechange=function(){
                  if(script.readyState == "loaded" || script.readyState == "complete"){
                      script.onreadystatechange=null;
                      callback();
                  }
                 }
             }else{
                 script.onload=function(){
                      callback();
                 }
             }
         }
        head.appendChild(script);
    }      
    
}

function checkDegree(degree){
    if(degree < 0) {
        degree += 360;
    } else if(degree > 360) {
        degree -= 360;
    }
}



/**
 * @param {String} path wasm 文件路径
 * @param {Object} imports 传递到 wasm 代码中的变量
 */
function loadWebAssembly (path, imports = {}) {
    return fetch(path)
      .then(response => response.arrayBuffer())
      .then(buffer => WebAssembly.compile(buffer))
      .then(module => {
        imports.env = imports.env || {}
  
        // 开辟内存空间
        imports.env.memoryBase = imports.env.memoryBase || 0
        if (!imports.env.memory) {
          imports.env.memory = new WebAssembly.Memory({ initial: 256 })
        }
  
        // 创建变量映射表
        imports.env.tableBase = imports.env.tableBase || 0
        if (!imports.env.table) {
          // 在 MVP 版本中 element 只能是 "anyfunc"
          imports.env.table = new WebAssembly.Table({ initial: 0, element: 'anyfunc' })
        }
  
        // 创建 WebAssembly 实例
        return new WebAssembly.Instance(module, imports)
      })
  }