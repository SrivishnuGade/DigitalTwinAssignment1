import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader";
import { loadedModels } from '../scenes/mainScene.js';

export function loadGLBModel(scene, filePath, renderer, ktx2Loader,name) {
  const loader = new GLTFLoader();

  // DRACOLoader setup
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("/assets/draco/");
  loader.setDRACOLoader(dracoLoader);
  
  // Set up KTX2Loader (for KTX2 textures)
  if (!ktx2Loader) {
    ktx2Loader = new KTX2Loader();
    ktx2Loader.setTranscoderPath("/assets/basis/"); // Path to the Basis Universal transcoder
    ktx2Loader.detectSupport(renderer);
  }
  loader.setKTX2Loader(ktx2Loader);

  // Load GLB file
  loader.load(
    filePath,
    (gltf) => {
      const model = gltf.scene;
      model.scale.set(2, 2, 2);
      model.position.set(0, 0, 0);
      scene.add(model);
      loadedModels[name] = model; 
      console.log(`Model ${name} loaded successfully!`);
    },
    (xhr) => {
      console.log(`Model loading progress: ${(xhr.loaded / xhr.total) * 100}%`);
    },
    (error) => {
      console.error("Error loading model:", error);
    }
  );
}
