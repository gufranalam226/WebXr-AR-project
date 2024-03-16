// import { GLTFLoader } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/GLTFLoader.js";
// import * as THREE from "https://cdn.skypack.dev/three@0.129.0/build/three.module.js";
// import { OrbitControls } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/controls/OrbitControls.js";

(async function() {
  const isArSessionSupported = navigator.xr && navigator.xr.isSessionSupported && await navigator.xr.isSessionSupported("immersive-ar");
  // if (isArSessionSupported) {
  //   document.getElementById("enter-ar").addEventListener("click", window.app.activateXR)
  // } else {
  //   onNoXRDevice();
  // }
  document.querySelectorAll('#enter-ar').forEach(element => {
    element.addEventListener('click', () => {
      if (isArSessionSupported) {
        window.app.activateXR();
      } else {
        onNoXRDevice();
      }
    });
  });
})();

let setPath;
imgName = (nm)=>{

  console.log(nm)
  setPath = nm;
    
}

class App {
  
  activateXR = async () => {
    try {
      this.xrSession = await navigator.xr.requestSession("immersive-ar", {
        requiredFeatures: ['hit-test', 'dom-overlay'],
        domOverlay: { root: document.body }
      });
      document.querySelector(".wrapper").style.display= "none";

      this.createXRCanvas();

      await this.onSessionStarted();
    } catch(e) {
      console.log(e);
      onNoXRDevice();
    }
  }

  
  createXRCanvas() {
    this.canvas = document.createElement("canvas");
    document.body.appendChild(this.canvas);
    this.gl = this.canvas.getContext("webgl", {xrCompatible: true});

    this.xrSession.updateRenderState({
      baseLayer: new XRWebGLLayer(this.xrSession, this.gl)
    });
  }

 
  onSessionStarted = async () => {
    document.body.classList.add('ar');

    // To help with working with 3D on the web, we'll use three.js.
    this.setupThreeJs();

    // Setup an XRReferenceSpace using the "local" coordinate system.
    this.localReferenceSpace = await this.xrSession.requestReferenceSpace('local');

    // Create another XRReferenceSpace that has the viewer as the origin.
    this.viewerSpace = await this.xrSession.requestReferenceSpace('viewer');
    // Perform hit testing using the viewer as origin.
    this.hitTestSource = await this.xrSession.requestHitTestSource({ space: this.viewerSpace });

    // Start a rendering loop using this.onXRFrame.
    this.xrSession.requestAnimationFrame(this.onXRFrame);
    try{

      this.xrSession.addEventListener("select", this.onSelect)  
    }
    catch(err){console.log(err)};
  }



  // async onSessionStarted() {
  //   document.body.classList.add('ar');

  //   this.setupThreeJs();

  //   this.localReferenceSpace = await this.xrSession.requestReferenceSpace('local');
  //   this.viewerSpace = await this.xrSession.requestReferenceSpace('viewer');

  //   // Use depth sensing for hit testing if available
  //   const options = {
  //     space: this.viewerSpace,
  //     offsetRay: new XRRay(new DOMPoint(0, 0, 0), new DOMPoint(0, 0, -1)),
  //     // Enable depth-sensing hit testing if available
  //     entityTypes: ['plane']
  //   };
  //   try {
  //     this.hitTestSource = await this.xrSession.requestHitTestSource(options);
  //   } catch (e) {
  //     console.warn('Depth-sensing hit test not available. Using default hit testing.');
  //     this.hitTestSource = await this.xrSession.requestHitTestSource({ space: this.viewerSpace });
  //   }

  //   this.xrSession.requestAnimationFrame(this.onXRFrame);

  //   this.xrSession.addEventListener("select", this.onSelect);
  // }

  onSelect = async (event) => {

    
    const modelPath = `../model_image/${setPath}/scene.gltf`;
    try {
      if (this.modelAtReticle) {
        this.scene.remove(this.modelAtReticle);
        this.modelAtReticle = null;
      }
        const loader = new THREE.GLTFLoader();
        const gltf = await new Promise((resolve, reject) => {
            loader.load(
                modelPath,
                resolve,
                undefined,
                reject
            );
        });

        const model = gltf.scene;


        // settting the position 
        const tapPosition = new THREE.Vector3();
        tapPosition.setFromMatrixPosition(this.reticle.matrix);
        model.position.copy(tapPosition);
        
        // model direction calculate
        const direction = new THREE.Vector3().subVectors(this.camera.position, model.position);
        direction.y = 0;

        // rotaion angle calculate
        const angle = Math.atan2(direction.x, direction.z);

        model.rotation.y = angle;
        this.scene.add(model);
        this.modelAtReticle = model;
        this.enableDragAndRotate(model);


        const shadowMesh = this.scene.children.find(c => c.name === 'shadowMesh');
        shadowMesh.position.y = model.position.y;
        
    } catch (error) {
        console.error('Error loading GLTF model:', error);
    }
  }


  enableDragAndRotate = (object) => {
    let isDragging = false;
    let isRotating = false;
    let previousMousePosition = {
        x: 0,
        y: 0
    };
    document.addEventListener('mousedown', (event) => {
      console.log(event.shiftKey);
        if (event.shiftKey) {
            isRotating = true;
        } else {
            isDragging = true;
        }
        previousMousePosition = {
            x: event.clientX,
            y: event.clientY
        };
    });

    document.addEventListener('mousemove', (event) => {
        if (isDragging) {
            const deltaMove = {
                x: event.clientX - previousMousePosition.x,
                y: event.clientY - previousMousePosition.y
            };

            object.position.x += deltaMove.x * 0.01;
            object.position.y -= deltaMove.y * 0.01;

            previousMousePosition = {
                x: event.clientX,
                y: event.clientY
            };
        } else if (isRotating) {
            const deltaRotate = {
                x: event.clientX - previousMousePosition.x,
                y: event.clientY - previousMousePosition.y
            };

            object.rotation.y += deltaRotate.x * 0.01;
            object.rotation.x += deltaRotate.y * 0.01;

            previousMousePosition = {
                x: event.clientX,
                y: event.clientY
            };
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        isRotating = false;
    });
}

  onXRFrame = (time, frame) => {
    this.xrSession.requestAnimationFrame(this.onXRFrame);

    // Bind the graphics framebuffer to the baseLayer's framebuffer.
    const framebuffer = this.xrSession.renderState.baseLayer.framebuffer
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer)
    this.renderer.setFramebuffer(framebuffer);

    // Retrieve the pose of the device.
    const pose = frame.getViewerPose(this.localReferenceSpace);
    if (pose) {
      const view = pose.views[0];

      const viewport = this.xrSession.renderState.baseLayer.getViewport(view);
      this.renderer.setSize(viewport.width, viewport.height)

      // Use the view's transform matrix and projection matrix to configure the THREE.camera.
      this.camera.matrix.fromArray(view.transform.matrix)
      this.camera.projectionMatrix.fromArray(view.projectionMatrix);
      this.camera.updateMatrixWorld(true);

      const hitTestResults = frame.getHitTestResults(this.hitTestSource);

      // If we have results, consider the environment stabilized.
      if (!this.stabilized && hitTestResults.length > 0) {
        this.stabilized = true;
        document.body.classList.add('stabilized');
      }
      if (hitTestResults.length > 0) {
        const hitPose = hitTestResults[0].getPose(this.localReferenceSpace);

        // Update the reticle position
        this.reticle.visible = true;
        this.reticle.position.set(hitPose.transform.position.x, hitPose.transform.position.y, hitPose.transform.position.z)
        this.reticle.updateMatrixWorld(true);
      }

      // Render the scene with THREE.WebGLRenderer.
      this.renderer.render(this.scene, this.camera)
    }
  }


  setupThreeJs() {
    // Set up the WebGLRenderer, which handles rendering to our session's base layer.
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      preserveDrawingBuffer: true,
      canvas: this.canvas,
      context: this.gl
    });
    this.renderer.autoClear = false;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Initialize our demo scene.
    this.scene = DemoUtils.createLitScene();
    this.reticle = new Reticle();
    this.scene.add(this.reticle);

    // disable matrix auto updates 
    this.camera = new THREE.PerspectiveCamera();
    this.camera.matrixAutoUpdate = false;
  }

};

window.app = new App();
