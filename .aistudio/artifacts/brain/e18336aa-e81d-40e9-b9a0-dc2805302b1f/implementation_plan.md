# Plan de Implementación: Simulador de Brazo Robótico XR

## 1. Visión General y Estilo
Simulador interactivo 3D y de Realidad Mixta (WebXR para Meta Quest y dispositivos XR con soporte para simulador de escritorio) basado en **XR Blocks** y **Three.js**.
- **Estilo Visual**: Minimalista futurista con carcasa blanca mate, biseles mecánicos oscuros, acentos y luces indicadoras en naranja robótico (#ff6b00 / #ff8c00), aristas estilizadas e iluminación limpia con sombras suaves.
- **Cinemática**:
  - Base giratoria 360° (Joint 1 / Yaw).
  - Hombro articulado con rango ergonómico (Joint 2 / Pitch).
  - Codo articulado coherente a la referencia visual (Joint 3 / Pitch).
  - Muñeca articulada con rotación y cabeceo (Joint 4 / Pitch y Roll).
  - Efector final / Garra con dos tenazas paralelas articuladas que abren y cierran suavemente hasta hacer contacto con el objeto.
- **Detección y Agarre de Objetos**:
  - Catálogo de objetos agarrables: Cubo, Cilindro, Esfera, Prisma Hexagonal y Barra rectangular (dimensionados a escala de 4 a 8 cm, dentro de los 12 cm de apertura máxima).
  - Detección de contacto con la pinza (Bounding Box / rayo de agarre), emparentamiento al agarrar y liberación con caída física hacia la superficie/pedestal.
- **Modos de Operación**:
  - **Manual**: Deslizadores angulares para cada junta, control de apertura de pinza, y selección directa de articulaciones con la mano o ratón.
  - **Automático A -> B / B -> A**: Secuencia automática cinemática que alinea la base, desciende, cierra la pinza, eleva el objeto, gira al pedestal destino, desciende y abre la pinza.
  - **Modo Continuo / Cinta Transportadora**: Generación cíclica de piezas que el brazo transfiere de forma autónoma.
- **Realidad Mixta & Audio**:
  - Colocación en mesa/superficie del mundo real mediante plano horizontal / depth mesh.
  - Audio procedural Web Audio API para simular el zumbido de servomotores con pitch según velocidad, clics mecánicos y sonido de bloqueo al agarrar.
  - Tarjeta Spatial UI flotante e interactiva construida con `xb.UICard`, `UISlider`, `UIButton`, paneles y selector de objetos.

---

## 2. Estructura de Clases y Módulos

```
/src
  ├── index.ts              # Inicialización de XR Blocks (Options, Hands, Depth, Audio, Simulator)
  ├── constants.ts          # Dimensiones, límites angulares de juntas, colores y presets de objetos
  ├── types.ts              # Interfaces para objetos agarrables, estados cinemáticos y waypoints
  ├── audio/
  │    └── RobotAudio.ts    # Sintetizador Web Audio API de servomotores y clics mecánicos
  ├── robot/
  │    ├── RobotArm.ts      # Jerarquía de Three.js MESH: Base, Shoulder, UpperArm, Elbow, Forearm, Wrist, Gripper
  │    ├── Kinematics.ts    # Cinemática directa (FK), cálculo de posición del efector e interpolación hacia objetivos (IK/Waypoints)
  │    └── Gripper.ts       # Cinemática de tenazas izquierda y derecha con detección de colisión/agarre
  ├── scene/
  │    ├── Workstation.ts   # Pedestales A y B, cinta transportadora animada y superficie de trabajo
  │    └── GrabbableManager.ts # Generador, gestor de objetos (cubo, cilindro, esfera, etc.) y física de caída
  └── ui/
       └── RobotSpatialUI.ts # Spatial UI con UICard de XR Blocks (controles manuales, automático, selector de piezas)
```

---

## 3. Plan de Ejecución Paso a Paso

1. **Configuración y Metadata (`metadata.json`, `index.html`)**:
   - Nombre de la app: "XR Robotic Arm Simulator".
   - Estructuración del viewport, estilos y permisos WebXR.

2. **Módulo de Audio (`RobotAudio.ts`)**:
   - Generación de sonido paramétrico de servos con osciladores Web Audio, modulación de frecuencia y ráfagas cortas para chasquido de agarre.

3. **Modelado y Geometría del Brazo Robótico (`RobotArm.ts`, `Gripper.ts`)**:
   - Construcción procedimental exacta de piezas según la imagen de referencia: base cilíndrica biselada, hombro con buje circular detallado, brazo extensor con cubierta protectora, junta de codo, antebrazo cilíndrico, soporte de muñeca y dos dedos mecánicos con almohadillas de agarre en naranja brillante.
   - Jerarquía Three.js para rotaciones anidadas y cálculo de forward kinematics.

4. **Gestión de Objetos y Estación de Trabajo (`Workstation.ts`, `GrabbableManager.ts`)**:
   - Plataforma con marcas visuales de Pedestal A (origen) y Pedestal B (destino).
   - Generación de objetos: Cubo, Cilindro, Esfera, Prisma Hexagonal y Barra rectangular con materiales de alta calidad y escala ajustada a la pinza.
   - Detección de proximidad: cuando la pinza se cierra sobre un objeto, se fija a la muñeca; al abrirse, se libera y desciende suavemente a la superficie.

5. **Lógica de Secuencia Automática y Cinta Transportadora**:
   - Máquina de estados para la animación fluida: `APPROACH_A -> DESCEND_A -> GRIP -> LIFT_A -> ROTATE_TO_B -> DESCEND_B -> RELEASE -> LIFT_B -> RETURN_HOME`.
   - Toggle de modo bucle infinito / cinta transportadora continua.

6. **Interfaz Espacial (`RobotSpatialUI.ts`)**:
   - Tarjeta ergonómica `xb.UICard` con pestañas o secciones:
     - *Manual*: Deslizadores para Base (0-360°), Hombro, Codo, Muñeca y Pinza (Abrir/Cerrar).
     - *Automático*: Botones "Transferir A → B", "Transferir B → A", "Ciclo Continuo", "Reset Posición".
     - *Objetos*: Selector de forma activa (Cubo, Cilindro, etc.), botón "Añadir en A", "Añadir en B", "Limpiar".
     - *Modo XR*: Botón para recalibrar o fijar en la mesa/superficie real.

7. **Verificación y Compilación**:
   - Ejecución de `compile_applet` y `lint_applet` para garantizar cero errores de TypeScript y empaquetado.
