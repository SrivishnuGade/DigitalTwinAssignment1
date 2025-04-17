import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

const m_car = 800;
const f_psi = 36;
const r_psi = 32;
const wheelbase = 2.435;
const hCOG = 0.6;
const CdA = 1.36;
const g = 9.81;

const m_disk = 5.5;
const c_disk = 460;
const sa_disk = 0.0314;

const sigma = 5.67e-8;
const emissivity = 0.95;

let T_env = 300;
let T_disk = T_env;
let T_disk_prev = T_env;
let rho = 1.01;

let t = 0.1;

let v_car = 30; // Starting with initial speed
let v_car_prev = 30;
let isBraking = false;
let isAccelerating = false;
let brakeDeceleration = 0; // m/s²
let acceleration = 0; // m/s²
let maxSpeed = 40; // Maximum speed in m/s

let a_car = 0;
let x_car = 0;
let Fr = 0;

let N_f = (m_car * f_psi) / (f_psi + r_psi);
let N_r = (m_car * r_psi) / (f_psi + r_psi);

let KE_car = 0;
let KE_car_prev = 0;

let KE_sheddedAtFront = 0;

let radiationHeatLoss = 0;
let convectionHeatLoss = 0;
let deltaT_radiation = 0;

// Store the original disk material for reverting back
let originalDiskMaterial = null;

// Temperature thresholds for color changes (in Celsius)
const minTempForColorChange = 50; // Start changing color at 50°C
const maxTempForColorChange = 500; // Full red at 500°C

const infoPanel = document.createElement('div');
infoPanel.style.position = 'absolute';
infoPanel.style.bottom = '10px';
infoPanel.style.left = '10px';
infoPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
infoPanel.style.color = 'white';
infoPanel.style.padding = '15px';
infoPanel.style.fontFamily = 'monospace';
infoPanel.style.fontSize = '16px'; // Increased font size
infoPanel.style.borderRadius = '5px';
infoPanel.style.width = '350px'; // Increased width
infoPanel.style.maxHeight = '80vh';
infoPanel.style.overflowY = 'auto';
document.body.appendChild(infoPanel);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xAAAAAA);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0.1, -0.5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

const ambientLight = new THREE.AmbientLight(0xffffff, 5);
scene.add(ambientLight);

const directionalLights = [
    new THREE.DirectionalLight(0xffffff, 2),
    new THREE.DirectionalLight(0xffffff, 2),
    new THREE.DirectionalLight(0xffffff, 2),
    new THREE.DirectionalLight(0xffffff, 2)
];

directionalLights[0].position.set(5, 5, 10);
directionalLights[1].position.set(-5, -5, -10);
directionalLights[2].position.set(5, 0, 0);
directionalLights[3].position.set(-5, 0, 5);

directionalLights.forEach(light => {
    light.castShadow = true;
    scene.add(light);
});

const loader = new GLTFLoader();
let model = null;
let disk = null;
let leftPad = null;
let rightPad = null;
let rotateDisk = true;

loader.load(
    'assets/SepLRBrake.glb',
    function (gltf) {
        // Check if gltf and gltf.scene exist before proceeding
        if (!gltf || !gltf.scene) {
            console.error('Invalid model structure:', gltf);
            return;
        }
        
        model = gltf.scene;
        
        try {
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            model.position.sub(center);
            
            // Create groups for left and right parts
            leftPad = new THREE.Group();
            rightPad = new THREE.Group();
            scene.add(leftPad);
            scene.add(rightPad);
            
            // Process model meshes
            model.traverse((node) => {
                if (node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                    
                    console.log(node.name);
                    if (node.name === "Disk") {
                        disk = node;
                        // Store the original material
                        originalDiskMaterial = node.material.clone();
                    }
                    if (node.name.endsWith("_L")) {
                        console.log("Left Pad: ", node.name);
                        // Create a reference rather than moving the object
                        // Clone the node's world matrix to position
                        leftPad.userData.parts = leftPad.userData.parts || [];
                        leftPad.userData.parts.push(node);
                    }
                    
                    // Same for right parts
                    if (node.name.endsWith("_R")) {
                        console.log("Right Pad: ", node.name);
                        rightPad.userData.parts = rightPad.userData.parts || [];
                        rightPad.userData.parts.push(node);
                    }
                }
            });
            
            scene.add(model);
        } catch (error) {
            console.error('Error processing model:', error);
        }
    },
    function (xhr) {
        // console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function (error) {
        console.error('Error loading model:', error);
        // Create fallback geometry if model fails to load
    }
);


// Function to update disk color based on temperature
function updateDiskColor() {
    if (!disk) return;
    
    // Get current temperature in Celsius
    const tempCelsius = T_disk - 273.15;
    
    // Calculate how "hot" the disk is as a percentage between our thresholds
    let heatPercentage = 0;
    if (tempCelsius > minTempForColorChange) {
        heatPercentage = Math.min(
            (tempCelsius - minTempForColorChange) / 
            (maxTempForColorChange - minTempForColorChange),
            1.0
        );
    }
    
    if (heatPercentage > 0) {
        // Create a new material based on the original but with color tinted toward red
        // Clone the original material if it exists
        const newMaterial = originalDiskMaterial ? originalDiskMaterial.clone() : disk.material.clone();
        
        // Interpolate between original color and red
        const startColor = new THREE.Color(0xcccccc); // Original gray color
        const endColor = new THREE.Color(0xff0000);   // Bright red
        
        const mixedColor = new THREE.Color().lerpColors(startColor, endColor, heatPercentage);
        newMaterial.color = mixedColor;
        
        // Add emissive glow for very hot disk
        if (heatPercentage > 0.5) {
            const emissiveIntensity = (heatPercentage - 0.5) * 2; // Scale from 0 to 1 for the upper half of heat range
            newMaterial.emissive = new THREE.Color(0xff0000);
            newMaterial.emissiveIntensity = emissiveIntensity;
        } else {
            newMaterial.emissive = new THREE.Color(0x000000);
            newMaterial.emissiveIntensity = 0;
        }
        
        disk.material = newMaterial;
    } else if (originalDiskMaterial) {
        // Return to original material when temperature is normal
        disk.material = originalDiskMaterial.clone();
    }
}

// Function to apply braking
function applyBrake() {
    if (v_car > 0 && brakeDeceleration > 0) {
        isBraking = true;
        isAccelerating = false;
        
        // Brake interval function to gradually reduce speed
        const brakeInterval = setInterval(() => {
            v_car = Math.max(0, v_car - (brakeDeceleration * t));
            
            // Update the speed display slider
            if (speedSlider) {
                speedSlider.value = v_car;
                speedValueLabel.textContent = `${(v_car*3.6).toFixed(1)} kmph`;
            }
            
            // Stop braking once speed reaches 0
            if (v_car <= 0) {
                clearInterval(brakeInterval);
                isBraking = false;
                updateButtonStates();
            }
        }, 100);
    }
}

// Function to accelerate
function accelerate() {
    if (v_car < maxSpeed && acceleration > 0) {
        isAccelerating = true;
        isBraking = false;
        
        // Acceleration interval function
        const accelerateInterval = setInterval(() => {
            v_car = Math.min(maxSpeed, v_car + (acceleration * t));
            
            // Update the speed display slider
            if (speedSlider) {
                speedSlider.value = v_car;
                speedValueLabel.textContent = `${(v_car*3.6).toFixed(1)} kmph`;
            }
            
            // Stop accelerating at max speed
            if (v_car >= maxSpeed) {
                clearInterval(accelerateInterval);
                isAccelerating = false;
                updateButtonStates();
            }
        }, 100);
    }
}

// Function to reset speed
function resetSpeed() {
    v_car = 30; // Reset to initial speed
    isBraking = false;
    isAccelerating = false;
    acceleration=0;
    brakeDeceleration=0;
    
    if (speedSlider) {
        speedSlider.value = v_car;
        speedValueLabel.textContent = `${(v_car*3.6).toFixed(1)} kmph`;
    }
    
    // Reset temperature
    T_disk = T_env;
    T_disk_prev = T_env;
    
    // Reset disk color
    if (disk && originalDiskMaterial) {
        disk.material = originalDiskMaterial.clone();
    }
    
    updateButtonStates();
}

// Function to update button states based on current speed
function updateButtonStates() {
    brakeButton.disabled = v_car <= 0 || brakeDeceleration <= 0;
    brakeButton.style.opacity = (v_car <= 0 || brakeDeceleration <= 0) ? "0.5" : "1";
    brakeButton.style.cursor = (v_car <= 0 || brakeDeceleration <= 0) ? "not-allowed" : "pointer";
    
    accelerateButton.disabled = v_car >= maxSpeed || acceleration <= 0;
    accelerateButton.style.opacity = (v_car >= maxSpeed || acceleration <= 0) ? "0.5" : "1";
    accelerateButton.style.cursor = (v_car >= maxSpeed || acceleration <= 0) ? "not-allowed" : "pointer";
}

setInterval(updateSimulation, 100);

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    
    // Update disk color based on temperature
    updateDiskColor();
    
    // Disk rotation speed directly tied to vehicle speed
    if (disk && rotateDisk && v_car > 0) {
        // Scale disk rotation with vehicle speed
        const rotationSpeedFactor = 1/0.381;
        disk.rotation.z += v_car * rotationSpeedFactor;
    }
    if (leftPad && rightPad && a_car <= 0) {
        // Update left pad position
        if (leftPad.userData.parts) {
            leftPad.position.z = 0.005 * a_car / 9.81;
            leftPad.userData.parts.forEach(part => {
                part.position.z = leftPad.position.z;
            });
        }
        
        // Update right pad position
        if (rightPad.userData.parts) {
            rightPad.position.z = -0.005 * a_car / 9.81;
            rightPad.userData.parts.forEach(part => {
                part.position.z = rightPad.position.z;
            });
        }
    }
    
    if (leftPad && rightPad && v_car === 0) {
        // Apply positions when stopped
        if (leftPad.userData.parts) {
            leftPad.position.z = -0.003;
            leftPad.userData.parts.forEach(part => {
                part.position.z = leftPad.position.z;
            });
        }
        
        if (rightPad.userData.parts) {
            rightPad.position.z = 0.003;
            rightPad.userData.parts.forEach(part => {
                part.position.z = rightPad.position.z;
            });
        }
    }
    
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateSimulation() {
    a_car = (v_car - v_car_prev) / t;
    N_f = (m_car * g * f_psi) / (f_psi + r_psi) + (hCOG * a_car) / wheelbase;
    N_r = (m_car * g * r_psi) / (f_psi + r_psi) - (hCOG * a_car) / wheelbase;
    KE_car = 0.5 * m_car * v_car ** 2;
    x_car = v_car * t;
    Fr = (1 / 2) * rho * CdA * v_car ** 2;

    if (KE_car_prev - KE_car > Fr * x_car) {
        KE_sheddedAtFront = ((KE_car_prev - KE_car) / 2) * (N_f / (N_f + N_r));
        T_disk = T_disk_prev + KE_sheddedAtFront / (c_disk * m_disk);
    }

    radiationHeatLoss = emissivity * sigma * sa_disk * (Math.pow(T_disk, 4) - Math.pow(T_env, 4));
    convectionHeatLoss = 5.78 * Math.pow(v_car,0.5) * sa_disk * (T_disk - T_env);
    deltaT_radiation = (radiationHeatLoss+convectionHeatLoss * t) / (m_disk * c_disk);
    T_disk = T_disk - deltaT_radiation;

    v_car_prev = v_car;
    T_disk_prev = T_disk;
    KE_car_prev = KE_car;

    // Format temperature with colored text
    const tempCelsius = T_disk - 273.15;
    let tempColor = '#ffffff'; // default white
    
    if (tempCelsius > 350) {
        tempColor = '#ff0000'; // red for very hot
    } else if (tempCelsius > 200) {
        tempColor = '#ff9900'; // orange for hot
    } else if (tempCelsius > 100) {
        tempColor = '#ffff00'; // yellow for warm
    }

    infoPanel.innerHTML = `
        <h2 style="margin-top: 0;">Simulation Variables</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; line-height: 1.6;">
            <div><strong>Vehicle Speed:</strong></div>
            <div>${(v_car*3.6).toFixed(2)} kmph</div>
            
            <div><strong>Disk Temperature:</strong></div>
            <div style="color: ${tempColor}; font-weight: bold;">${tempCelsius.toFixed(2)}°C</div>
            
            <div><strong>Kinetic Energy:</strong></div>
            <div>${KE_car.toFixed(2)} J</div>
            
            <div><strong>Heat Loss:</strong></div>
            <div>${radiationHeatLoss.toFixed(2)} W</div>
            
            <div><strong>Normal Force (Front):</strong></div>
            <div>${N_f.toFixed(2)} N</div>
            
            <div><strong>Normal Force (Rear):</strong></div>
            <div>${N_r.toFixed(2)} N</div>
            
            <div><strong>Acceleration:</strong></div>
            <div>${a_car.toFixed(2)} m/s²</div>
            
            <div><strong>Energy Shed (Front):</strong></div>
            <div>${KE_sheddedAtFront.toFixed(2)} J</div>
        </div>
    `;
}

// Control container for all controls
const controlContainer = document.createElement('div');
controlContainer.style.position = 'absolute';
controlContainer.style.bottom = '10px';
controlContainer.style.right = '10px';
controlContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
controlContainer.style.color = 'white';
controlContainer.style.padding = '15px';
controlContainer.style.fontFamily = 'monospace';
controlContainer.style.borderRadius = '5px';
controlContainer.style.display = 'flex';
controlContainer.style.flexDirection = 'column';
controlContainer.style.gap = '15px';
document.body.appendChild(controlContainer);

// Add vertical sliders for brake deceleration and acceleration rate
// Create a container for the sliders
const slidersContainer = document.createElement('div');
slidersContainer.style.display = 'flex';
slidersContainer.style.gap = '20px';
slidersContainer.style.marginBottom = '15px';
controlContainer.appendChild(slidersContainer);

// Brake deceleration slider
const brakeSliderContainer = document.createElement('div');
brakeSliderContainer.style.display = 'flex';
brakeSliderContainer.style.flexDirection = 'column';
brakeSliderContainer.style.alignItems = 'center';
brakeSliderContainer.style.gap = '5px';
slidersContainer.appendChild(brakeSliderContainer);

const brakeSliderLabel = document.createElement('label');
brakeSliderLabel.textContent = 'Deceleration (m/s²)';
brakeSliderLabel.style.textAlign = 'center';
brakeSliderContainer.appendChild(brakeSliderLabel);

const brakeSlider = document.createElement('input');
brakeSlider.type = 'range';
brakeSlider.min = '0';
brakeSlider.max = '9.8';
brakeSlider.step = '0.1';
brakeSlider.value = brakeDeceleration;
brakeSlider.style.height = '150px';
brakeSlider.style.WebkitAppearance = 'slider-vertical';
brakeSlider.style.writingMode = 'bt-lr';
brakeSlider.style.transform = 'rotate(180deg)';
brakeSlider.addEventListener('input', function() {
    brakeDeceleration = parseFloat(this.value);
    brakeSliderValue.textContent = brakeDeceleration.toFixed(1);
    
    // Set acceleration to zero when brake is applied
    if (brakeDeceleration > 0) {
        acceleration = 0;
        accelSlider.value = '0';
        accelSliderValue.textContent = '0.0';
        isAccelerating = false;
        isBraking=true;
    }
    
    // Update braking flag
    isBraking = brakeDeceleration > 0;
    
    updateButtonStates();
});
brakeSliderContainer.appendChild(brakeSlider);

const brakeSliderValue = document.createElement('span');
brakeSliderValue.textContent = brakeDeceleration.toFixed(1);
brakeSliderValue.style.fontWeight = 'bold';
brakeSliderContainer.appendChild(brakeSliderValue);

// Acceleration slider
const accelSliderContainer = document.createElement('div');
accelSliderContainer.style.display = 'flex';
accelSliderContainer.style.flexDirection = 'column';
accelSliderContainer.style.alignItems = 'center';
accelSliderContainer.style.gap = '5px';
slidersContainer.appendChild(accelSliderContainer);

const accelSliderLabel = document.createElement('label');
accelSliderLabel.textContent = 'Acceleration (m/s²)';
accelSliderLabel.style.textAlign = 'center';
accelSliderContainer.appendChild(accelSliderLabel);

const accelSlider = document.createElement('input');
accelSlider.type = 'range';
accelSlider.min = '0';
accelSlider.max = '5';
accelSlider.step = '0.1';
accelSlider.value = acceleration;
accelSlider.style.height = '150px';
accelSlider.style.WebkitAppearance = 'slider-vertical';
accelSlider.style.writingMode = 'bt-lr';
accelSlider.style.transform = 'rotate(180deg)';
accelSlider.addEventListener('input', function() {
    acceleration = parseFloat(this.value);
    accelSliderValue.textContent = acceleration.toFixed(1);
    
    // Set brake to zero when accelerating
    if (acceleration > 0) {
        brakeDeceleration = 0;
        brakeSlider.value = '0';
        brakeSliderValue.textContent = '0.0';
        isBraking = false;
        isAccelerating=true;
    }
    
    // Update accelerating flag
    isAccelerating = acceleration > 0;
    
    updateButtonStates();
});
accelSliderContainer.appendChild(accelSlider);

const accelSliderValue = document.createElement('span');
accelSliderValue.textContent = acceleration.toFixed(1);
accelSliderValue.style.fontWeight = 'bold';
accelSliderContainer.appendChild(accelSliderValue);

// Add speed display
const speedControlGroup = document.createElement('div');
speedControlGroup.style.display = 'flex';
speedControlGroup.style.alignItems = 'center';
speedControlGroup.style.gap = '10px';
controlContainer.appendChild(speedControlGroup);

const speedLabel = document.createElement('label');
speedLabel.textContent = 'Speed:';
speedLabel.style.marginRight = '5px';
speedControlGroup.appendChild(speedLabel);

// Display-only slider for speed
const speedSlider = document.createElement('input');
speedSlider.type = 'range';
speedSlider.min = '0';
speedSlider.max = maxSpeed;
speedSlider.step = '0.1';
speedSlider.value = v_car;
speedSlider.style.width = '150px';
speedSlider.disabled = true; // Make it display-only
speedControlGroup.appendChild(speedSlider);

const speedValueLabel = document.createElement('span');
speedValueLabel.textContent = `${(v_car*3.6).toFixed(1)} kmph`;
speedValueLabel.style.minWidth = '60px';
speedControlGroup.appendChild(speedValueLabel);

// Add brake, accelerate and reset buttons
const buttonGroup = document.createElement('div');
buttonGroup.style.display = 'flex';
buttonGroup.style.gap = '10px';
buttonGroup.style.justifyContent = 'space-between';
controlContainer.appendChild(buttonGroup);

const brakeButton = document.createElement('button');
brakeButton.textContent = 'BRAKE';
brakeButton.style.padding = '8px 15px';
brakeButton.style.backgroundColor = '#f44336';
brakeButton.style.border = 'none';
brakeButton.style.borderRadius = '3px';
brakeButton.style.color = 'white';
brakeButton.style.cursor = 'pointer';
brakeButton.style.fontWeight = 'bold';
brakeButton.addEventListener('click', applyBrake);
buttonGroup.appendChild(brakeButton);

const accelerateButton = document.createElement('button');
accelerateButton.textContent = 'ACCELERATE';
accelerateButton.style.padding = '8px 15px';
accelerateButton.style.backgroundColor = '#2196F3';
accelerateButton.style.border = 'none';
accelerateButton.style.borderRadius = '3px';
accelerateButton.style.color = 'white';
accelerateButton.style.cursor = 'pointer';
accelerateButton.style.fontWeight = 'bold';
accelerateButton.addEventListener('click', accelerate);
buttonGroup.appendChild(accelerateButton);

const resetButton = document.createElement('button');
resetButton.textContent = 'RESET';
resetButton.style.padding = '8px 15px';
resetButton.style.backgroundColor = '#4CAF50';
resetButton.style.border = 'none';
resetButton.style.borderRadius = '3px';
resetButton.style.color = 'white';
resetButton.style.cursor = 'pointer';
resetButton.style.fontWeight = 'bold';
resetButton.addEventListener('click', resetSpeed);
buttonGroup.appendChild(resetButton);

// // Add disk rotation toggle
// const rotationControlGroup = document.createElement('div');
// rotationControlGroup.style.display = 'flex';
// rotationControlGroup.style.alignItems = 'center';
// rotationControlGroup.style.gap = '10px';
// controlContainer.appendChild(rotationControlGroup);

// // Create label for rotation
// const rotationLabel = document.createElement('label');
// rotationLabel.textContent = 'Disk Rotation:';
// rotationLabel.style.marginRight = '5px';
// rotationControlGroup.appendChild(rotationLabel);

// // Create toggle button for disk rotation
// const rotationToggle = document.createElement('button');
// rotationToggle.textContent = rotateDisk ? 'ON' : 'OFF';
// rotationToggle.style.padding = '5px 10px';
// rotationToggle.style.backgroundColor = rotateDisk ? '#4CAF50' : '#f44336';
// rotationToggle.style.border = 'none';
// rotationToggle.style.borderRadius = '3px';
// rotationToggle.style.color = 'white';
// rotationToggle.style.cursor = 'pointer';
// rotationToggle.addEventListener('click', () => {
//     rotateDisk = !rotateDisk;
//     rotationToggle.textContent = rotateDisk ? 'ON' : 'OFF';
//     rotationToggle.style.backgroundColor = rotateDisk ? '#4CAF50' : '#f44336';
// });
// rotationControlGroup.appendChild(rotationToggle);

// Initialize button states
updateButtonStates();