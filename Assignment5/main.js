import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {OBJLoader} from 'three/addons/loaders/OBJLoader.js';
import {MTLLoader} from 'three/addons/loaders/MTLLoader.js';
import GUI from 'lil-gui'; 
import { DDSLoader } from 'three/addons/loaders/DDSLoader.js';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';

class ColorGUIHelper {
    constructor(object, prop) {
        this.object = object;
        this.prop = prop;
    }
    get value() {
    return `#${this.object[this.prop].getHexString()}`;
    }
    set value(hexString) {
        this.object[this.prop].set(hexString);
    }
}

class MinMaxGUIHelper {
    constructor(obj, minProp, maxProp, minDif) {
        this.obj = obj;
        this.minProp = minProp;
        this.maxProp = maxProp;
        this.minDif = minDif;
    }
    get min() {
        return this.obj[this.minProp];
    }
    set min(v) {
        this.obj[this.minProp] = v;
        this.obj[this.maxProp] = Math.max(this.obj[this.maxProp], v + this.minDif);
    }
    get max() {
        return this.obj[this.maxProp];
    }
    set max(v) {
        this.obj[this.maxProp] = v;
        this.min = this.min;  
    }
}

function main() {
    const canvas = document.querySelector('#c');
    const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });

    const cam1Elem = document.querySelector('#cam1');
    const cam2Elem = document.querySelector('#cam2');

    const fov = 45;
    const aspect = 2; 
    const near = 0.1;
    const far = 100;
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(0, 10, 20);

    const controls = new OrbitControls(camera, cam1Elem);
    controls.target.set(0, 5, 0);
    controls.update();

    const cameraHelper = new THREE.CameraHelper(camera);

    const planeSize = 40;

    let icaModel = null;
 
    const loader = new THREE.TextureLoader();
    const texture = loader.load('model/checker.png');
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.NearestFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    const repeats = planeSize / 2;
    texture.repeat.set(repeats, repeats);

    function updateCamera() {
        camera.updateProjectionMatrix();
    }


    const scene = new THREE.Scene();

    const exrLoader = new EXRLoader();
    exrLoader.load('model/evening_road_01_puresky_4k.exr', (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.background = texture;
    });


    const boxWidth = 1;
    const boxHeight = 1;
    const boxDepth = 1;
    const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);

    const loaderNihility = new THREE.TextureLoader();
    const textureNihility = loaderNihility.load( 'nihility.jpg' );
    texture.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.MeshPhongMaterial({map: textureNihility});
    const cube = new THREE.Mesh(geometry, material);

    const camera2 = new THREE.PerspectiveCamera(
        60,  // fov
        2,   // aspect
        0.1, // near
        500, // far
    );
    camera2.position.set(40, 10, 30);
    camera2.lookAt(0, 5, 0);
    
    const controls2 = new OrbitControls(camera2, cam2Elem);
    controls2.target.set(0, 5, 0);
    controls2.update();

    // scene.add(cube);

    renderer.render(scene, camera);

    function setScissorForElement(elem) {
        const canvasRect = canvas.getBoundingClientRect();
        const elemRect = elem.getBoundingClientRect();
        
        const right = Math.min(elemRect.right, canvasRect.right) - canvasRect.left;
        const left = Math.max(0, elemRect.left - canvasRect.left);
        const bottom = Math.min(elemRect.bottom, canvasRect.bottom) - canvasRect.top;
        const top = Math.max(0, elemRect.top - canvasRect.top);
        
        const width = Math.min(canvasRect.width, right - left);
        const height = Math.min(canvasRect.height, bottom - top);
        
        const positiveYUpBottom = canvasRect.height - bottom;
        renderer.setScissor(left, positiveYUpBottom, width, height);
        renderer.setViewport(left, positiveYUpBottom, width, height);
        
        return width / height;
    }

    function resizeRendererToDisplaySize(renderer) {
        const canvas = renderer.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const needResize = canvas.width !== width || canvas.height !== height;
        if (needResize) {
            renderer.setSize(width, height, false);
        }
        return needResize;
    }

    function render(time) {
        time *= 0.001;

        cube.rotation.x = time;
        cube.rotation.y = time;

        resizeRendererToDisplaySize(renderer);
        renderer.setScissorTest(true);

        // First Camera View (cam1Elem)
        {
            const aspect = setScissorForElement(cam1Elem);
            camera.aspect = aspect;
            camera.updateProjectionMatrix();
            cameraHelper.visible = false;
            lightHelper.visible = false;
            renderer.setClearColor(0x000000);
            renderer.render(scene, camera);
        }

        // Second Camera View (cam2Elem)
        {
            const aspect = setScissorForElement(cam2Elem);
            camera2.aspect = aspect;
            camera2.updateProjectionMatrix();
            cameraHelper.visible = true;
            lightHelper.visible = false;
            renderer.setClearColor(0x000040);
            renderer.render(scene, camera2);
        }

        for (let i = 0; i < orbitCubes.length; i++) {
            const cube = orbitCubes[i];
            cube.userData.orbitAngle += orbitSpeed * 0.01;

            const x = Math.cos(cube.userData.orbitAngle) * orbitRadius;
            const z = Math.sin(cube.userData.orbitAngle) * orbitRadius;
            cube.position.set(x, 2, z);

            const innerRadius = orbitRadius * 0.7;
            const angleOffset = Math.PI / 4; 
            const sphereAngle = cube.userData.orbitAngle + angleOffset;
            const x2 = Math.cos(sphereAngle) * innerRadius;
            const z2 = Math.sin(sphereAngle) * innerRadius;
            const sphere = orbitSpheres[i]; 
            sphere.position.set(x2, 3.2, z2);

            for (let i = 0; i < orbitPyramids.length; i++) {
                const pyramid = orbitPyramids[i];
                pyramid.userData.orbitAngle += orbitSpeed * 0.008; 

                const angle = pyramid.userData.orbitAngle;
                const x = Math.cos(angle) * pyramidOrbitRadius;
                const z = Math.sin(angle) * pyramidOrbitRadius;
                pyramid.position.set(x, 2.5, z);
                pyramid.lookAt(0, 2.5, 0); 
            }

        }

        orbitingLightAngle += orbitSpeed * 0.01;
        const lx = Math.cos(orbitingLightAngle) * orbitingLightRadius;
        const lz = Math.sin(orbitingLightAngle) * orbitingLightRadius;
        orbitingLight.position.set(lx, orbitingLightHeight, lz);

        for (let i = activeBurgers.length - 1; i >= 0; i--) {
            const burgerData = activeBurgers[i];
            const mesh = burgerData.mesh;

            const dir = new THREE.Vector3(0, 2, 0).sub(mesh.position).normalize();
            mesh.position.addScaledVector(dir, burgerData.speed);

            // Check if burger reached center
            if (mesh.position.distanceTo(new THREE.Vector3(0, 2, 0)) < 1.5) {
                scene.remove(mesh);
                activeBurgers.splice(i, 1);

                // Scale up Ica model
                if (icaModel) {
                    icaModel.scale.multiplyScalar(1.05);
                }
            }
        }


        requestAnimationFrame(render);
    }


    const color = 0xFFFFFF;
    const intensity = 1;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(0, 10, 0);
    light.target.position.set(-5, 0, 0);
    scene.add(light);
    scene.add(light.target);

    function makeInstance(geometry, color, x) {
        const material = new THREE.MeshPhongMaterial({color});
        
        const cube = new THREE.Mesh(geometry, material);
        scene.add(cube);
        
        cube.position.x = x;
        
        return cube;
    }

    /* const cubes = [
        makeInstance(geometry, 0x7989a7, -1),
        makeInstance(geometry, 0x44aa88,  1),
        makeInstance(geometry, 0x8844aa, -2),
        makeInstance(geometry, 0xaa8844,  2),
    ]; */

    const mtlLoader = new MTLLoader();
    const objLoader = new OBJLoader();
    const ddsLoader = new DDSLoader();

    mtlLoader.load('model/IcaProject.mtl', (mtl) => {
        mtl.preload();

        for (const materialName in mtl.materials) {
            const mat = mtl.materials[materialName];

            if (mat.map && typeof mat.map === 'string' && mat.map.endsWith('.dds')) {
                const texture = ddsLoader.load(`model/${mat.map}`);
                mat.map = texture;
                mat.needsUpdate = true;
            }
        }
        
        objLoader.setMaterials(mtl);
        objLoader.load('model/IcaProject.obj', (root) => {
            root.scale.set(-20, 20, 20);
            root.position.set(0, -1, 0);
            icaModel = root;
            root.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            scene.add(root);
        });
    });

    const shadowPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(100, 100),
        new THREE.ShadowMaterial({ opacity: 0.3 })
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    let burgerTemplate = null;

    const burgerMtlLoader = new MTLLoader();
    const burgerObjLoader = new OBJLoader();

    burgerMtlLoader.load('model/burger.mtl', (mtl) => {
        mtl.preload();
        burgerObjLoader.setMaterials(mtl);

        burgerObjLoader.load('model/burger.obj', (obj) => {
            burgerTemplate = obj;

            burgerTemplate.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
        });
    });


    // Outer Ring
    const ringGeometry = new THREE.TorusGeometry(15, 0.5, 16, 100); // (radius, tube radius, radial segments, tubular segments)
    const ringMaterial = new THREE.MeshPhongMaterial({
        color: 0x9a54d4,
        emissive: 0x111100,
        shininess: 100,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2; 
    ring.position.y = 2; 
    ring.scale.set(1.5, 1.5, 0.3); 
    scene.add(ring);

    // Inner Ring
    const secondringGeometry = new THREE.TorusGeometry(10, 0.5, 16, 100); // (radius, tube radius, radial segments, tubular segments)
    const secondringMaterial = new THREE.MeshPhongMaterial({
        color: 0x9a54d4,
        emissive: 0x111100,
        shininess: 100,
    });
    const secondring = new THREE.Mesh(secondringGeometry, secondringMaterial);
    secondring.rotation.x = Math.PI / 2;
    secondring.position.y = 2;
    secondring.scale.set(1.5, 1.5, 0.3);
    scene.add(secondring);

    const orbitCubes = [];
    const orbitSpheres = [];
    const orbitPyramids = [];
    const orbitRadius = 10;
    const orbitSpeed = 0.5;
    const pyramidOrbitRadius = 17.5;

    let orbitingLightAngle = 0;
    const orbitingLightRadius = 18;
    const orbitingLightHeight = 5;

    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;

        // Create cube
        const cube = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshPhongMaterial({ map: textureNihility })
        );
        cube.userData.orbitAngle = angle;
        cube.castShadow = true;
        cube.receiveShadow = true;
        scene.add(cube);
        orbitCubes.push(cube);

        // Create icosphere
        const icosphere = new THREE.Mesh(
            new THREE.IcosahedronGeometry(0.5, 0),
            new THREE.MeshPhongMaterial({ color: 0x8888ff, flatShading: true })
        );
        icosphere.castShadow = true;
        icosphere.receiveShadow = true;
        scene.add(icosphere);
        orbitSpheres.push(icosphere);

        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;

            const pyramid = new THREE.Mesh(
                new THREE.ConeGeometry(0.6, 1.2, 4),
                new THREE.MeshPhongMaterial({ color: 0x8888ff, flatShading: true })
            );
            pyramid.userData.orbitAngle = angle;
            pyramid.rotation.y = angle; 
            pyramid.castShadow = true;
            pyramid.receiveShadow = true;
            scene.add(pyramid);
            orbitPyramids.push(pyramid);
        }
    }


    /* const planeGeo = new THREE.PlaneGeometry(planeSize, planeSize);
    const planeMat = new THREE.MeshPhongMaterial({
    map: texture,
    side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(planeGeo, planeMat);
    mesh.rotation.x = Math.PI * -0.4;
    scene.add(mesh); */

    const activeBurgers = [];

    function summonBurger() {
    if (!burgerTemplate) return;

    const burger = burgerTemplate.clone(true);
    burger.traverse((child) => {
        if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        }
    });

    const radius = 30;
    const angle = Math.random() * 2 * Math.PI;
    const y = Math.random() * 10 + 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    burger.position.set(x, y, z);

    scene.add(burger);

    activeBurgers.push({ mesh: burger, speed: 0.1 });
    }


    const lightHelper = new THREE.DirectionalLightHelper(light);
    scene.add(lightHelper);

    const orbitingLight = new THREE.PointLight(0xdbdf26, 100, 100); // color, intensity, distance
    orbitingLight.position.set(0, 5, 20);
    orbitingLight.castShadow = true;
    scene.add(orbitingLight);

    renderer.shadowMap.enabled = true;
    


    // small visual marker for the light
    const lightSphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xdbdf26 })
    );
    orbitingLight.add(lightSphere);
    


    function makeXYZGUI(gui, vector3, name, onChangeFn) {
        const folder = gui.addFolder(name);
        folder.add(vector3, 'x', -20, 20).onChange(onChangeFn);
        folder.add(vector3, 'y', 0, 10).onChange(onChangeFn);
        folder.add(vector3, 'z', -20, 20).onChange(onChangeFn);
        folder.open();
    }

    function updateLight() {
        light.target.updateMatrixWorld();
        lightHelper.update();
    }
    updateLight();
    
    const gui = new GUI();
    gui.addColor(new ColorGUIHelper(light, 'color'), 'value').name('color');
    gui.add(light, 'intensity', 0, 5, 0.01);
    const cameraFolder = gui.addFolder('Camera');
    cameraFolder.add(camera, 'fov', 1, 180).onChange(updateCamera);
    const minMaxGUIHelper = new MinMaxGUIHelper(camera, 'near', 'far', 0.1);
    cameraFolder.add(minMaxGUIHelper, 'min', 0.1, 50, 0.1).name('near').onChange(updateCamera);
    cameraFolder.add(minMaxGUIHelper, 'max', 0.1, 50, 0.1).name('far').onChange(updateCamera);
    cameraFolder.open();


    const ambientLight = new THREE.AmbientLight(0x404040, 1);
    scene.add(ambientLight);
    const ambientFolder = gui.addFolder('Ambient Light');
    ambientFolder.addColor(new ColorGUIHelper(ambientLight, 'color'), 'value').name('color');
    ambientFolder.add(ambientLight, 'intensity', 0, 5, 0.01).name('intensity');
    ambientFolder.open();

    scene.add(cameraHelper);

    makeXYZGUI(gui, light.position, 'Directional Light Position', updateLight);
    makeXYZGUI(gui, light.target.position, 'Directional Light Target', updateLight);

    gui.add({ summonBurger }, 'summonBurger').name('Summon Burger');

    

    

    requestAnimationFrame(render);
}

main();
