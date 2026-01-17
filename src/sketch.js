// Project: Visitor
// Sketch 01: A Study of Emergent Behavior
//
// This file is the main entry point for the p5.js sketch.
// It will contain the logic for the Boids simulation.

// --- Global Variables ---
// We will define variables that need to be accessible across the sketch here.
const flock = [];

// Sliders for controlling the simulation parameters in real-time.
let alignSlider, cohesionSlider, separationSlider;

// --- p5.js Setup Function ---
// This function runs once when the sketch is first loaded.
function setup() {
  // Create a canvas that fills the entire browser window.
  createCanvas(windowWidth, windowHeight);

  // --- Slider Initialization ---
  // Create sliders to control the weights of the three flocking rules.
  // The sliders will have a range from 0 to 5 with a default value of 1.
  // A step of 0.1 allows for fine-tuning.
  
  // Alignment Slider
  createP('Alignment').style('color', '#FFF').position(10, 5);
  alignSlider = createSlider(0, 5, 1, 0.1);
  alignSlider.position(10, 40);

  // Cohesion Slider
  createP('Cohesion').style('color', '#FFF').position(10, 45);
  cohesionSlider = createSlider(0, 5, 1, 0.1);
  cohesionSlider.position(10, 80);

  // Separation Slider
  createP('Separation').style('color', '#FFF').position(10, 85);
  separationSlider = createSlider(0, 5, 1, 0.1);
  separationSlider.position(10, 120);


  // --- Boid Initialization ---
  for (let i = 0; i < 150; i++) { // Increased boid count for a denser flock
    flock.push(new Boid());
  }
}

// --- p5.js Draw Function ---
function draw() {
  background(17, 17, 17);

  for (let boid of flock) {
    boid.edges();
    boid.flock(flock);
    boid.update();
    boid.show();
  }
}

// --- Boid Class ---
class Boid {
  constructor() {
    this.position = createVector(random(width), random(height));
    this.velocity = p5.Vector.random2D();
    this.velocity.setMag(random(2, 4));
    this.acceleration = createVector();
    this.maxForce = 0.2;
    this.maxSpeed = 5;
    this.perceptionRadius = 50;
  }

  edges() {
    if (this.position.x > width) {
      this.position.x = 0;
    } else if (this.position.x < 0) {
      this.position.x = width;
    }
    if (this.position.y > height) {
      this.position.y = 0;
    } else if (this.position.y < 0) {
      this.position.y = height;
    }
  }

  align(boids) {
    let steering = createVector();
    let total = 0;
    for (let other of boids) {
      let d = dist(this.position.x, this.position.y, other.position.x, other.position.y);
      if (other != this && d < this.perceptionRadius) {
        steering.add(other.velocity);
        total++;
      }
    }
    if (total > 0) {
      steering.div(total);
      steering.setMag(this.maxSpeed);
      steering.sub(this.velocity);
      steering.limit(this.maxForce);
    }
    return steering;
  }

  cohesion(boids) {
    let steering = createVector();
    let total = 0;
    for (let other of boids) {
      let d = dist(this.position.x, this.position.y, other.position.x, other.position.y);
      if (other != this && d < this.perceptionRadius) {
        steering.add(other.position);
        total++;
      }
    }
    if (total > 0) {
      steering.div(total);
      steering.sub(this.position);
      steering.setMag(this.maxSpeed);
      steering.sub(this.velocity);
      steering.limit(this.maxForce);
    }
    return steering;
  }

  separation(boids) {
    let steering = createVector();
    let total = 0;
    for (let other of boids) {
      let d = dist(this.position.x, this.position.y, other.position.x, other.position.y);
      if (other != this && d < this.perceptionRadius) {
        let diff = p5.Vector.sub(this.position, other.position);
        diff.div(d * d);
        steering.add(diff);
        total++;
      }
    }
    if (total > 0) {
      steering.div(total);
      steering.setMag(this.maxSpeed);
      steering.sub(this.velocity);
      steering.limit(this.maxForce);
    }
    return steering;
  }

  flock(boids) {
    let alignment = this.align(boids);
    let cohesion = this.cohesion(boids);
    let separation = this.separation(boids);

    // Use the sliders' values to weight each force.
    alignment.mult(alignSlider.value());
    cohesion.mult(cohesionSlider.value());
    separation.mult(separationSlider.value());

    this.acceleration.add(alignment);
    this.acceleration.add(cohesion);
    this.acceleration.add(separation);
  }

  update() {
    this.velocity.add(this.acceleration);
    this.velocity.limit(this.maxSpeed);
    this.position.add(this.velocity);
    this.acceleration.mult(0);
  }

  show() {
    const angle = this.velocity.heading() + PI / 2;
    push();
    translate(this.position.x, this.position.y);
    rotate(angle);
    const size = 5;
    fill(200, 200, 200, 150);
    stroke(255);
    beginShape();
    vertex(0, -size * 2);
    vertex(-size, size * 2);
    vertex(size, size * 2);
    endShape(CLOSE);
    pop();
  }
}

// --- Window Resize Handling ---
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
