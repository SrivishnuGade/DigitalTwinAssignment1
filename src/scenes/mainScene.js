import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader';
import { loadGLBModel } from '../loaders/glbloader.js';

let lx = 1.0;
let ly = 0.0;
let lz = 1.0;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 5);
camera.position.set(lx, ly, lz);
console.log('Camera position:', camera.position);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.minPolarAngle = 0;
controls.maxPolarAngle = Math.PI;
controls.enableDamping = true;
controls.dampingFactor = 0.1;

const sunlight = new THREE.DirectionalLight(0xffffff, 3);
sunlight.position.set(lx, ly, lz);
sunlight.castShadow = true;
sunlight.shadow.camera.left = -500;
sunlight.shadow.camera.right = 500;
sunlight.shadow.camera.top = 500;
sunlight.shadow.camera.bottom = -500;
sunlight.shadow.camera.near = 0.5;
sunlight.shadow.camera.far = 1000;
sunlight.shadow.bias = -0.0005;
sunlight.shadow.mapSize.width = 4096;
sunlight.shadow.mapSize.height = 4096;
scene.add(sunlight);

// KTX2Loader setup
const ktx2Loader = new KTX2Loader();
ktx2Loader.setTranscoderPath("/assets/basis/");
ktx2Loader.detectSupport(renderer);

// Raycaster for object selection
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selectedObject = null;

// Store models as separate entities
export const loadedModels = {};

// Load models
loadGLBModel(scene, '/assets/Disk.glb', renderer, ktx2Loader, "Disk");
loadGLBModel(scene, '/assets/FrameR.glb', renderer, ktx2Loader, "FrameR");
loadGLBModel(scene, '/assets/FrameL.glb', renderer, ktx2Loader, "FrameL");
loadGLBModel(scene, '/assets/Piping.glb', renderer, ktx2Loader, "Piping");
loadGLBModel(scene, '/assets/Piston Rings.glb', renderer, ktx2Loader, "PistonRings");
loadGLBModel(scene, '/assets/Pistons.glb', renderer, ktx2Loader, "Pistons");
loadGLBModel(scene, '/assets/Screws.glb', renderer, ktx2Loader, "Screws");
loadGLBModel(scene, '/assets/Shoes.glb', renderer, ktx2Loader, "Shoes");
loadGLBModel(scene, '/assets/Tube.glb', renderer, ktx2Loader, "Tube");
loadGLBModel(scene, '/assets/Washers.glb', renderer, ktx2Loader, "Washers");
loadGLBModel(scene, '/assets/Springs.glb', renderer, ktx2Loader, "Springs");
// Add other models as needed
console.log('Loaded models:', loadedModels);

// function onMouseClick(event) {
//     // Normalize mouse position
//     mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
//     mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
//     // Set up the raycaster to use camera and mouse position
//     raycaster.setFromCamera(mouse, camera);
  
//     // Check for intersections with the objects in the scene
//     const intersects = raycaster.intersectObjects(Object.values(loadedModels), true);
  
//     if (intersects.length > 0) {
//       selectedObject = intersects[0].object;
//       console.log('Selected object:', selectedObject);
//     } else {
//       selectedObject = null;
//       console.log('No object selected');
//     }
//   }

function onMouseClick(event) {
    // Normalize mouse position
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    console.log('Mouse position:', mouse); // Log mouse position

    // Set up the raycaster to use camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    // Check for intersections with the objects in the scene
    const intersects = raycaster.intersectObjects(Object.values(loadedModels), true);

    if (intersects.length > 0) {
        selectedObject = intersects[0].object;
        console.log('Selected object:', selectedObject);
    } else {
        selectedObject = null;
        console.log('No object selected');
    }
}


// Arrow key movement for the selected object
function onKeyDown(event) {
  if (selectedObject) {
    const moveDistance = 0.005; // Adjust the movement speed

    // Move object along the X, Y, or Z axis depending on the arrow key pressed
    switch (event.key) {
      case 'ArrowUp':
        selectedObject.position.y += moveDistance;
        break;
      case 'ArrowDown':
        selectedObject.position.y -= moveDistance;
        break;
      case 'ArrowLeft':
        selectedObject.position.x -= moveDistance;
        break;
      case 'ArrowRight':
        selectedObject.position.x += moveDistance;
        break;
      case 'z':
        selectedObject.position.z += moveDistance;
        break;
      case 'x':
        selectedObject.position.z -= moveDistance;
        break;
      default:
        break;
    }
    console.log('selectedObject:', selectedObject);
    console.log('Object position:', selectedObject.position);
  }
}

// Event listeners for mouse and keyboard input
window.addEventListener('click', onMouseClick, false);
window.addEventListener('keydown', onKeyDown, false);

// Animation loop
function animate() {
  lx = camera.position.x;
  ly = camera.position.y;
  lz = camera.position.z;
  sunlight.position.set(lx, ly, lz);

  controls.update(); // Update camera controls
  renderer.render(scene, camera); // Render the scene
  requestAnimationFrame(animate); // Repeat the animation loop
}

animate();



