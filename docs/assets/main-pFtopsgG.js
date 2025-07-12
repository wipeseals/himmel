import o,{analyze_files_wasm as l}from"/himmel.js";(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))s(r);new MutationObserver(r=>{for(const i of r)if(i.type==="childList")for(const n of i.addedNodes)n.tagName==="LINK"&&n.rel==="modulepreload"&&s(n)}).observe(document,{childList:!0,subtree:!0});function t(r){const i={};return r.integrity&&(i.integrity=r.integrity),r.referrerPolicy&&(i.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?i.credentials="include":r.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function s(r){if(r.ep)return;r.ep=!0;const i=t(r);fetch(r.href,i)}})();class d{constructor(e,t){this.container=e,this.onBinarySelect=t,this.render()}render(){const e=[{program:"hello",arch:"x86_64",name:"Hello World (C)",size:"767KB"},{program:"hello",arch:"aarch64",name:"Hello World (C)",size:"619KB"},{program:"hello",arch:"riscv64",name:"Hello World (C)",size:"544KB"},{program:"fibonacci",arch:"x86_64",name:"Fibonacci (C)",size:"768KB"},{program:"fibonacci",arch:"aarch64",name:"Fibonacci (C)",size:"620KB"},{program:"fibonacci",arch:"riscv64",name:"Fibonacci (C)",size:"544KB"},{program:"counter",arch:"x86_64",name:"Counter (Rust)",size:"3.6MB"},{program:"counter",arch:"aarch64",name:"Counter (Rust)",size:"3.6MB"},{program:"counter",arch:"riscv64",name:"Counter (Rust)",size:"3.7MB"}],t=this.groupBinaries(e);this.container.innerHTML=`
      <div class="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">Try Demo Binaries</h2>
        <p class="text-gray-600 mb-4">
          Select from pre-compiled demo programs to quickly test himmel's analysis capabilities.
        </p>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          ${Object.entries(t).map(([s,r])=>this.renderProgramGroup(s,r)).join("")}
        </div>

        <div id="demo-binary-info" class="mt-4 hidden">
          <div class="flex items-center text-sm text-green-600 bg-green-50 border border-green-200 rounded p-3">
            <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
            </svg>
            <span id="demo-binary-name">Demo binary loaded</span>
          </div>
        </div>
      </div>
    `,this.attachEventListeners()}groupBinaries(e){const t={};return e.forEach(s=>{t[s.program]||(t[s.program]=[]),t[s.program].push(s)}),t}renderProgramGroup(e,t){const s=this.getDisplayName(e),r=this.getDescription(e);return`
      <div class="border border-gray-200 rounded-lg p-4">
        <h3 class="font-medium text-gray-900 mb-2">${s}</h3>
        <p class="text-sm text-gray-600 mb-3">${r}</p>
        <div class="space-y-2">
          ${t.map(i=>`
            <button class="demo-binary-btn w-full text-left px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50 transition-colors" 
                    data-program="${i.program}" data-arch="${i.arch}">
              📄 ${i.arch} (${i.size})
            </button>
          `).join("")}
        </div>
      </div>
    `}getDisplayName(e){return{hello:"Hello World (C)",fibonacci:"Fibonacci (C)",counter:"Counter (Rust)"}[e]||e}getDescription(e){return{hello:"Simple C program compiled for different architectures",fibonacci:"Recursive fibonacci calculator in C",counter:"Simple counter program written in Rust"}[e]||""}attachEventListeners(){this.container.querySelectorAll(".demo-binary-btn").forEach(t=>{t.addEventListener("click",async s=>{const r=s.target,i=r.dataset.program,n=r.dataset.arch;await this.handleBinarySelect(r,i,n)})})}async handleBinarySelect(e,t,s){const r=e.textContent;e.textContent="Loading...",e.disabled=!0;try{await this.onBinarySelect(t,s),this.showSuccessMessage(`Demo binary loaded: ${t} (${s})`)}catch(i){throw console.error("Error loading demo binary:",i),i}finally{e.textContent=r,e.disabled=!1}}showSuccessMessage(e){const t=this.container.querySelector("#demo-binary-info"),s=this.container.querySelector("#demo-binary-name");s.textContent=e,t.classList.remove("hidden"),setTimeout(()=>{t.classList.add("hidden")},3e3)}}class c{constructor(e,t){this.container=e,this.onFileSelect=t,this.render()}render(){this.container.innerHTML=`
      <div class="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">Or Upload Your Own ELF Files</h2>
        
        <!-- ELF File Upload -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-2">ELF Binary File</label>
          <div class="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-primary transition-colors" id="elf-dropzone">
            <div class="space-y-1 text-center">
              <svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <div class="flex text-sm text-gray-600">
                <label for="elf-file-upload" class="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-secondary focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary">
                  <span>Upload ELF file</span>
                  <input id="elf-file-upload" name="elf-file-upload" type="file" class="sr-only">
                </label>
                <p class="pl-1">or drag and drop</p>
              </div>
              <p class="text-xs text-gray-500">Binary files up to 10MB</p>
            </div>
          </div>
          <div id="elf-file-info" class="mt-2 hidden">
            <div class="flex items-center text-sm text-gray-600">
              <svg class="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
              </svg>
              <span id="elf-file-name"></span>
              <span id="elf-file-size" class="ml-2 text-gray-400"></span>
            </div>
          </div>
        </div>

        <!-- Analyze Button -->
        <div class="flex justify-center">
          <button id="analyze-btn" 
                  class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  disabled>
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
            </svg>
            Analyze ELF File
          </button>
        </div>
      </div>
    `,this.attachEventListeners()}attachEventListeners(){this.container.querySelector("#elf-file-upload").addEventListener("change",t=>{const s=t.target.files;s&&s.length>0&&this.handleFileSelect(s[0])}),this.setupDragAndDrop()}setupDragAndDrop(){const e=this.container.querySelector("#elf-dropzone");e.addEventListener("dragover",t=>{t.preventDefault(),e.classList.add("border-primary","bg-blue-50")}),e.addEventListener("dragleave",t=>{t.preventDefault(),e.classList.remove("border-primary","bg-blue-50")}),e.addEventListener("drop",t=>{var r;t.preventDefault(),e.classList.remove("border-primary","bg-blue-50");const s=(r=t.dataTransfer)==null?void 0:r.files;s&&s.length>0&&this.handleFileSelect(s[0])})}handleFileSelect(e){if(!e)return;const t=10*1024*1024;if(e.size>t)throw new Error("File size exceeds 10MB limit");this.updateFileInfo(e.name,e.size),this.onFileSelect(e)}updateFileInfo(e,t){const s=this.container.querySelector("#elf-file-info"),r=this.container.querySelector("#elf-file-name"),i=this.container.querySelector("#elf-file-size");r.textContent=e,i.textContent=`(${this.formatFileSize(t)})`,s.classList.remove("hidden")}formatFileSize(e){if(e===0)return"0 Bytes";const t=1024,s=["Bytes","KB","MB","GB"],r=Math.floor(Math.log(e)/Math.log(t));return parseFloat((e/Math.pow(t,r)).toFixed(2))+" "+s[r]}updateAnalyzeButton(e){const t=this.container.querySelector("#analyze-btn");t.disabled=!e}getAnalyzeButton(){return this.container.querySelector("#analyze-btn")}}class m{constructor(e){this.container=e}render(e){let t="";e.elf_info&&(t+=this.renderElfInfo(e.elf_info)),t+=this.renderRawJson(e),this.container.innerHTML=t}renderElfInfo(e){return`
      <div class="mb-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-3">ELF Binary Information</h3>
        <div class="bg-gray-50 rounded-lg p-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt class="text-sm font-medium text-gray-500">Architecture</dt>
              <dd class="mt-1 text-sm text-gray-900">${e.architecture}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-gray-500">File Type</dt>
              <dd class="mt-1 text-sm text-gray-900">${e.file_type}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-gray-500">Entry Point</dt>
              <dd class="mt-1 text-sm text-gray-900">0x${e.entry_point.toString(16)} (${e.entry_point})</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-gray-500">Endianness</dt>
              <dd class="mt-1 text-sm text-gray-900">${e.endianness}</dd>
            </div>
          </div>
          ${e.sections&&e.sections.length>0?`
            <div class="mt-4">
              <dt class="text-sm font-medium text-gray-500">Sections (${e.sections.length})</dt>
              <dd class="mt-1">
                <div class="flex flex-wrap gap-1 mt-1">
                  ${e.sections.map(t=>`<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">${t}</span>`).join("")}
                </div>
              </dd>
            </div>
          `:""}
        </div>
      </div>
      ${this.renderDwarfInfo(e)}
    `}renderDwarfInfo(e){return!e.functions&&!e.variables&&!e.types?"":`
      <div class="mb-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-3">DWARF Debug Information</h3>
        
        ${this.renderFunctions(e.functions)}
        ${this.renderVariables(e.variables)}
        ${this.renderTypes(e.types)}
      </div>
    `}renderFunctions(e){return!e||e.length===0?"":`
      <div class="mb-6">
        <h4 class="text-md font-medium text-gray-900 mb-3">Functions (${e.length})</h4>
        <div class="bg-white border rounded-lg divide-y divide-gray-200">
          ${e.map(t=>`
            <div class="p-4">
              <div class="flex items-center justify-between mb-2">
                <h5 class="font-medium text-gray-900">${t.name}</h5>
                <div class="flex gap-2">
                  ${t.address?`<span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">0x${t.address.toString(16)}</span>`:""}
                  ${t.size?`<span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">${t.size} bytes</span>`:""}
                </div>
              </div>
              ${t.parameters&&t.parameters.length>0?`
                <div class="mt-2">
                  <span class="text-sm font-medium text-gray-600">Parameters:</span>
                  <div class="mt-1 flex flex-wrap gap-1">
                    ${t.parameters.map(s=>`
                      <span class="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                        ${s.name}: ${s.type_info.name}
                      </span>
                    `).join("")}
                  </div>
                </div>
              `:""}
              ${t.return_type?`
                <div class="mt-2">
                  <span class="text-sm font-medium text-gray-600">Returns:</span>
                  <span class="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded ml-1">${t.return_type.name}</span>
                </div>
              `:""}
            </div>
          `).join("")}
        </div>
      </div>
    `}renderVariables(e){return!e||e.length===0?"":`
      <div class="mb-6">
        <h4 class="text-md font-medium text-gray-900 mb-3">Variables (${e.length})</h4>
        <div class="bg-white border rounded-lg divide-y divide-gray-200">
          ${e.map(t=>`
            <div class="p-4">
              <div class="flex items-center justify-between mb-2">
                <h5 class="font-medium text-gray-900">${t.name}</h5>
                <div class="flex gap-2">
                  <span class="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">${t.scope}</span>
                  ${t.address?`<span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">0x${t.address.toString(16)}</span>`:""}
                  ${t.offset!==null&&t.offset!==void 0?`<span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">offset: ${t.offset}</span>`:""}
                </div>
              </div>
              <div>
                <span class="text-sm font-medium text-gray-600">Type:</span>
                <span class="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded ml-1">
                  ${t.type_info.name} (${t.type_info.kind})
                </span>
                ${t.type_info.size?`<span class="text-xs text-gray-500 ml-1">${t.type_info.size} bytes</span>`:""}
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `}renderTypes(e){return!e||e.length===0?"":`
      <div class="mb-6">
        <h4 class="text-md font-medium text-gray-900 mb-3">Type Definitions (${e.length})</h4>
        <div class="bg-white border rounded-lg divide-y divide-gray-200">
          ${e.map(t=>`
            <div class="p-4">
              <div class="flex items-center justify-between mb-2">
                <h5 class="font-medium text-gray-900">${t.name}</h5>
                <div class="flex gap-2">
                  <span class="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">${t.kind}</span>
                  ${t.size?`<span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">${t.size} bytes</span>`:""}
                </div>
              </div>
              ${t.members&&t.members.length>0?`
                <div class="mt-2">
                  <span class="text-sm font-medium text-gray-600">Members:</span>
                  <div class="mt-1 space-y-1">
                    ${t.members.map(s=>`
                      <div class="flex items-center justify-between text-sm bg-gray-50 rounded px-2 py-1">
                        <span class="font-medium">${s.name}</span>
                        <div class="flex gap-2">
                          <span class="text-xs bg-gray-200 text-gray-700 px-1 rounded">offset: ${s.offset}</span>
                          <span class="text-xs bg-indigo-100 text-indigo-800 px-1 rounded">${s.type_info.name}</span>
                        </div>
                      </div>
                    `).join("")}
                  </div>
                </div>
              `:""}
            </div>
          `).join("")}
        </div>
      </div>
    `}renderRawJson(e){return`
      <div class="mb-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-3">Raw JSON Output</h3>
        <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
          <pre class="text-sm text-green-400"><code>${JSON.stringify(e,null,2)}</code></pre>
        </div>
      </div>
    `}}class u{constructor(){this.state={wasmModule:null,elfFile:null,isLoading:!1,error:null,results:null},this.init()}async init(){try{for(;!window.initWasm;)await new Promise(e=>setTimeout(e,50));this.state.wasmModule=await window.initWasm(),this.setupComponents(),console.log("Himmel WebAssembly module loaded successfully")}catch(e){console.error("Failed to load WebAssembly module:",e),this.showError("Failed to load WebAssembly module. Please refresh the page.")}}setupComponents(){const e=document.getElementById("demo-section"),t=document.getElementById("upload-section"),s=document.getElementById("results-content");this.demoSection=new d(e,this.handleDemoBinarySelect.bind(this)),this.uploadSection=new c(t,this.handleFileSelect.bind(this)),this.resultsRenderer=new m(s),this.uploadSection.getAnalyzeButton().addEventListener("click",()=>{this.analyzeFiles()})}async handleDemoBinarySelect(e,t){try{const s=await fetch(`demo-binaries/bin/${t}/${e}`);if(!s.ok)throw new Error(`Failed to load demo binary: ${s.statusText}`);const r=await s.arrayBuffer(),i=new Blob([r],{type:"application/octet-stream"}),n=new File([i],`${e}-${t}`,{type:"application/octet-stream"});this.state.elfFile=n,this.uploadSection.updateAnalyzeButton(!0)}catch(s){throw this.showError(`Failed to load demo binary: ${s.message}`),s}}handleFileSelect(e){this.state.elfFile=e,this.uploadSection.updateAnalyzeButton(!0)}async analyzeFiles(){if(!this.state.wasmModule){this.showError("WebAssembly module not loaded");return}this.showLoading(!0),this.hideError(),this.hideResults();try{let e=null;this.state.elfFile&&(e=new Uint8Array(await this.state.elfFile.arrayBuffer()));const t=window.analyze_files_wasm(e),s=JSON.parse(t);if(s.error)throw new Error(s.error);this.state.results=s,this.showResults(s)}catch(e){console.error("Analysis error:",e),this.showError(`Analysis failed: ${e.message}`)}finally{this.showLoading(!1)}}showLoading(e){this.state.isLoading=e;const t=document.getElementById("loading");e?t.classList.remove("hidden"):t.classList.add("hidden")}showError(e){this.state.error=e;const t=document.getElementById("error"),s=document.getElementById("error-content");s.textContent=e,t.classList.remove("hidden")}hideError(){this.state.error=null,document.getElementById("error").classList.add("hidden")}showResults(e){const t=document.getElementById("results");this.resultsRenderer.render(e),t.classList.remove("hidden")}hideResults(){this.state.results=null,document.getElementById("results").classList.add("hidden")}}document.addEventListener("DOMContentLoaded",()=>{new u});window.initWasm=o;window.analyze_files_wasm=l;
