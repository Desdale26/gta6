import * as THREE from 'three';
const UP = new THREE.Vector3(0,1,0);
// convention check
for (const yaw of [0, 0.3]) {
  const q = new THREE.Quaternion().setFromAxisAngle(UP, yaw);
  const fwd = new THREE.Vector3(0,0,1).applyQuaternion(q);
  const right = new THREE.Vector3(1,0,0).applyQuaternion(q);
  console.log('yaw', yaw, 'fwd', fwd.toArray().map(n=>n.toFixed(3)), 'expected', [Math.sin(yaw),0,Math.cos(yaw)].map(n=>n.toFixed(3)),
    'right', right.toArray().map(n=>n.toFixed(3)), 'expected', [Math.cos(yaw),0,-Math.sin(yaw)].map(n=>n.toFixed(3)));
}
// positive steerAngle -> which way does the wheel point?
const q0 = new THREE.Quaternion();
const up = new THREE.Vector3(0,1,0), fwd = new THREE.Vector3(0,0,1), right = new THREE.Vector3(1,0,0);
const steer = 0.4;
const q1 = new THREE.Quaternion().setFromAxisAngle(up, steer);
const wf = fwd.clone().applyQuaternion(q1);
console.log('steer +0.4 wheel forward =', wf.toArray().map(n=>n.toFixed(3)), ' dot(right)=', wf.dot(right).toFixed(3));
// integrate: positive angularVelocity about +Y -> does yaw increase (turn right)?
let quat = new THREE.Quaternion();
const w = new THREE.Vector3(0, 1, 0); // +1 rad/s about world Y
const dt = 0.001;
for (let i=0;i<1000;i++){
  const q2 = new THREE.Quaternion(w.x*dt*0.5, w.y*dt*0.5, w.z*dt*0.5, 0).multiply(quat);
  quat.x+=q2.x; quat.y+=q2.y; quat.z+=q2.z; quat.w+=q2.w; quat.normalize();
}
const f2 = new THREE.Vector3(0,0,1).applyQuaternion(quat);
console.log('after +1 rad/s about +Y for 1s, forward =', f2.toArray().map(n=>n.toFixed(3)), ' yaw=', Math.atan2(f2.x,f2.z).toFixed(3), '(positive yaw => turned toward +X = right)');
