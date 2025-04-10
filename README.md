# 🔧 Digital Twin of a Disk Brake – Thermal Simulation

## 🚗 Overview

This project implements a **Digital Twin** of a **Disk Brake** to simulate the **temperature dynamics** of the brake disc under real-world driving conditions.

Using **physics-based modeling** and **thermodynamic principles**, it calculates how the disc temperature evolves over time based on:

- **Kinetic and potential energy transformations**
- **Heat generation from braking forces**
- **Heat dissipation** through:
  - Radiation
  - Conduction
  - Convection
- **Energy losses** from:
  - Air resistance
  - Transmission drag

This project simulates the **front braking system** of my **Suzuki Ignis**, with all physical constants and parameters tailored specifically to the vehicle. It serves as a **simulation backend** for automotive digital twin applications, enabling real-time monitoring of conditions such as **brake fade due to overheating**, as well as supporting **predictive maintenance** and **brake system design optimization**.

---

## 📐 Core Concepts Modeled

### 🧮 Physics-Based Calculations

| Physical Effect              | Modeled Through                                      |
|-----------------------------|------------------------------------------------------|
| Braking Energy              | Work-energy principle from kinetic energy           |
| Heat Generation             | Frictional work converted into heat                 |
| Heat Loss: Radiation        | Stefan–Boltzmann law                                |
| Heat Loss: Convection       | Newton’s law of cooling                             |
| Air Drag & Transmission Drag| Modeled as additional resistive forces              |

---

## 🧊 Thermal Simulation Workflow

1. **Initial Conditions**
   - Vehicle-specific parameters: speed, mass, front/rear weight distribution, wheelbase, height of COG, drag coefficient, frontal area
   - Brake disc properties: mass, surface area, heat capacity
   - Ambient temperature and airflow

2. **Energy Balance**
   - Compute loss in kinetic and potential energy per time-step
   - Calculate heat generated from brake force applied

3. **Thermal Dynamics**
   - Update disc temperature using radiation, convection, and conduction heat loss models
   - Incorporate additional work done by air drag and transmission loss

4. **Real-Time Output**
   - Temperature vs. time plot
   - Warnings/alerts for brake fade and overheating risk

---

## ⚙️ Tech Stack

- **Language:** JavaScript
- **Visualization:** [Three.js](https://threejs.org) for 3D modeling and rendering of the braking system
- **Modeling:** Custom physics equations implemented manually
- **Data Source:** Real-time inputs from a **Bluetooth OBD-II scanner**

Additionally, the simulation includes **dynamic weight transfer to the front axle during braking**, enhancing the realism of brake force and heat generation calculations.

---

## 🚀 Getting Started

Check out the live simulation here:  
👉 [https://digital-twin-assignment1.vercel.app](https://digital-twin-assignment1.vercel.app)


---

## 🔮 Future Enhancements

- [ ] Add rear disc simulation with biasing control
- [ ] Add support for terrain and slope-based braking scenarios

---

## 🤝 Contributing

Open to collaboration and feature suggestions.  
Feel free to fork the repo, raise issues, or submit pull requests!

---

## 🧠 Authors

- **[Srivishnu Muni Gade](https://github.com/SrivishnuGade)**  
  📧 gade.srivishnu@gmail.com

- **[Tejas Naik J](https://github.com/tejasnaikj)**  
  📧 tejasnaikj7887@gmail.com
