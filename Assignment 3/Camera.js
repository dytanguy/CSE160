'use strict';

/**
 * @param {Vector3} p1 
 * @param {Vector3} p2 
 * @returns {Vector4} 
 */
function points2plane(p1, p2, p3){
    let leg1 = new Vector3(p1.elements);
    leg1.sub(p2);
    let leg2 = new Vector3(p3.elements);
    leg2.sub(p2);
    let normal = Vector3.cross(leg1, leg2);
    normal.normalize();
    let D = -Vector3.dot(p1, normal);
    return new Vector4([...normal.elements, D]);
}
/**
 * @param {Vector4} plane 
 * @param {Vector3} point 
 * @returns {Number} 
 */
function distPlane(plane, point){
    let top = plane.elements[0] * point.elements[0] +
            plane.elements[1] * point.elements[1] +
            plane.elements[2] * point.elements[2] +
            plane.elements[3];
    return top; 
}
class Camera {
    constructor(aspect, isOrtho, width){
        this.fov = 60;
        this.eye = new Vector3();
        this.at = new Vector3([0, 0, -1]);
        this.up = new Vector3([0, 1, 0]);
        this.viewMatrix = new Matrix4();
        this.viewMatrix.setLookAt(
            ...this.eye.elements,
            ...this.at.elements,
            ...this.up.elements
        );
        this.projectionMatrix = new Matrix4();
        if (!isOrtho){
            this.projectionMatrix.perspective(
                this.fov,
                aspect,
                0.1,
                1000
            );
        } else {
            if (width === undefined){
                throw new Error("You must specify a width if using orthographic projection");
            }
            let height = width / aspect;
            this.projectionMatrix.setOrtho(
                -width, width,
                -height, height, 
                0.1, 1000
            );
        }
        this.inv_vp_matrix = new Matrix4(this.projectionMatrix);
        this.inv_vp_matrix.invert();
        this.frustumPoints = null;
        this.frustumPlanes = null;
        this.getFrustumPlanes();
    }
    move(forward, left, up){        
        let lookDir = new Vector3(this.at.elements);
        lookDir.sub(this.eye);
        lookDir.normalize();
        let perpDir = Vector3.cross(this.up, lookDir);
        perpDir.normalize();
        let upDir = new Vector3(this.up.elements);
        upDir.normalize();
        lookDir.mul(forward);
        perpDir.mul(left);
        upDir.mul(up);
        let total = new Vector3([0, 0, 0]);
        total.add(lookDir);
        total.add(perpDir);
        total.add(upDir);
        this.eye.add(total);
        this.at.add(total);
        this.#postMove();
    }
    goTo(x, y, z){
        let delta = new Vector3([x, y, z]).sub(this.eye).mul(1);
        this.at.add(delta);
        this.eye.add(delta);
        this.#postMove();
    }
    #pan(x, y){
        let lookDir = new Vector3(this.at.elements);
        lookDir.sub(this.eye);
        let perpDir = Vector3.cross(this.up, lookDir);
        perpDir.normalize();        
        let rotMat = new Matrix4();
        rotMat.rotate(x, ...this.up.elements);
        rotMat.rotate(y, ...perpDir.elements);
        lookDir = rotMat.multiplyVector3(lookDir);
        lookDir.add(this.eye);
        this.at = lookDir;
        this.#postMove();
    }
    #postMove(){
        this.viewMatrix.setLookAt(
            ...this.eye.elements,
            ...this.at.elements,
            ...this.up.elements
        );
        this.frustumPoints = null;
        this.frustumPlanes = null;
    }
    moveForwards = (speed) => this.move(speed, 0, 0);
    moveBackwards = (speed) => this.move(-speed, 0, 0);
    moveLeft = (speed) => this.move(0, speed, 0);
    moveRight = (speed) => this.move(0, -speed, 0);
    panLeft = (angle) => this.#pan(angle, 0);
    panRight = (angle) => this.#pan(-angle, 0);
    panUp = (angle) => this.#pan(0, angle);
    panDown = (angle) => this.#pan(0, -angle);
    /**
    * @returns {Vector3[]}
    */
    getFrustumPoints(){
        if (this.frustumPoints != null){
            return this.frustumPoints;
        }
        let points = [];
        this.inv_vp_matrix = new Matrix4(this.projectionMatrix);
        this.inv_vp_matrix.multiply(this.viewMatrix);
        this.inv_vp_matrix.invert();
        for (var i = 0; i < 8; i++){
            points.push(this.inv_vp_matrix.multiplyVector4(new Vector4([
                i & 1 ? -1 : 1,
                i & 2 ? -1 : 1,
                i & 4 ? 0 : 1,
                1
            ])));
            points[i] = new Vector3(points[i].elements.slice(0, 3).map((x) => x / points[i].elements[3]));
        }
        this.frustumPoints = points;
        return points;
    }
    /**
     * @returns {Vector4[]} 
     */
    getFrustumPlanes(){

        if (this.frustumPlanes != null){
            return this.frustumPlanes;
        }
        let p = this.getFrustumPoints();
        let planes = [
            points2plane(p[0], p[4], p[1]), 
            points2plane(p[2], p[4], p[0]), 
            points2plane(p[1], p[5], p[3]), 
            points2plane(p[3], p[6], p[2]), 
            points2plane(p[5], p[4], p[7]), 
            points2plane(p[1], p[3], p[0]), 
        ];
        this.frustumPlanes = planes;
        return planes;
    }
    /**
     * @param {Vector3} pt 
     * @returns {Boolean} 
     */
    getPointInFrustum(pt){
        let planes = this.getFrustumPlanes();
        for (let i = 0; i < planes.length; i++){
            let dist = distPlane(planes[i], pt);
            if (dist > 0){
                return false;
            }
        }       
        return true; 
    }
    /**
     * @param {Vector3} center 
     * @param {Number} radius 
     * @return {Boolean} 
     */
    getSphereInFrustum(center, radius){
        let planes = this.getFrustumPlanes();
        for (let i = 0; i < planes.length; i++){
            let dist = distPlane(planes[i], center);
            if (dist > radius){
                return false;
            }
        }       
        return true; 
    }
    getAABB(){
        let points = this.getFrustumPoints();
        let minPt = new Vector3(points[0].elements);
        let maxPt = new Vector3(points[0].elements);
        for (var p = 0; p < points.length; p++){
            for (var i = 0; i < 3; i++){
                minPt.elements[i] = Math.min(minPt.elements[i], points[p].elements[i]);
                maxPt.elements[i] = Math.max(maxPt.elements[i], points[p].elements[i]);
            }
        }
        return [minPt, maxPt];
    }
}