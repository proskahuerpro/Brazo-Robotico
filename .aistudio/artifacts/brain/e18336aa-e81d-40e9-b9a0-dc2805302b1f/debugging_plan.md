# Plan de Depuración y Mejoras: Simulador de Brazo Robótico en Meta Quest

## 1. Problemas Identificados y Diagnóstico
1. **Aparición de objetos al pulsar los botones**:
   - Al pulsar "Crear en A" o "Crear en B", la posición se pasaba en coordenadas locales que podían ser ocultadas o colisionar de forma incorrecta con la mesa. Se reestructurará el `GrabbableManager` para que los objetos se posicionen con precisión visible sobre la superficie superior de cada pedestal (`y = 0.08m + altura_objeto/2`).
   - Se asegura que las geometrías tridimensionales (`BoxGeometry`, `CylinderGeometry`, `SphereGeometry`, etc.) tengan materiales `MeshStandardMaterial` con colores saturados y brillantes, sombras activadas y escala clara de ~5 a 7 cm.

2. **Rotación de la Muñeca (Roll & Pitch)**:
   - La muñeca tiene dos ejes cinemáticos: **Pitch** (cabeceo hacia arriba/abajo) y **Roll** (giro axial 360° de la herramienta).
   - En la Spatial UI faltaba el deslizador explícito para el **Giro de Muñeca (Roll: -180° a 180°)** y la orientación de los ejes locales en Three.js (`wristRollGroup.rotation.y` vs eje longitudinal).
   - Se ajustará el eje de rotación axial longitudinal de la muñeca para que el giro de 360° sea completamente visible y responda tanto a los controles manuales como a los waypoints.

3. **Resaltado Visual de Detección de Agarre**:
   - Se incorporará un indicador visual: cuando el efector o pinzas estén dentro del rango de agarre de un objeto (~6 cm), el objeto activará un brillo/halo emissive naranja/azul indicando que está listo para ser atrapado.

4. **Eliminación de la Cinta Transportadora**:
   - Se retirará la banda animada (`conveyorBelt`), manteniendo una mesa de trabajo limpia, minimalista y con enfoque claro en el robot y los pedestales A y B.
   - El modo de "Ciclo Continuo" ahora alternará de forma fluida el transporte entre el Pedestal A y el Pedestal B sin la animación de la cinta.

5. **Interacción y Botones en Gafas Quest**:
   - Ajuste de los botones de la Spatial UI (`xb.UIButton`) para garantizar que el raycast y el toque directo en WebXR respondan al instante sin bloqueos de propagación de eventos.

---

## 2. Archivos a Modificar
1. `/src/scene/Workstation.ts`: Eliminar `conveyorBelt` y limpiar la escena.
2. `/src/robot/RobotArm.ts`: Corregir la cadena de transformación del giro de muñeca (Roll y Pitch) para rotación fluida de 360°.
3. `/src/scene/GrabbableManager.ts`: Mejorar la generación de objetos 3D, física de descanso en pedestal y detección de rango con efecto emissive de proximidad.
4. `/src/ui/RobotSpatialUI.ts`: Añadir control deslizante de "Giro de Muñeca (Roll 360°)", reajustar los botones de creación de objetos en A y B con feedback instantáneo y eliminar menciones a la cinta.
5. `/src/index.ts`: Adaptar el ciclo de actualización (`update`), retirar llamadas a la cinta y verificar la interacción en Meta Quest.
