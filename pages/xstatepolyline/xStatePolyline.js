import Konva from "konva";
import { createMachine, interpret } from "xstate";


const stage = new Konva.Stage({
    container: "container",
    width: 400,
    height: 400,
});

const layer = new Konva.Layer();
stage.add(layer);

const MAX_POINTS = 10;
let polyline // La polyline en cours de construction;

const polylineMachine = createMachine(
    {
        /** @xstate-layout N4IgpgJg5mDOIC5QAcD2AbAngGQJYDswA6XCdMAYgFkB5AVQGUBRAYWwEkWBpAbQAYAuohSpYuAC65U+YSAAeiAIwAWRUQBMAVgDMATj4A2LQBoQmJQYDsRPooAc67Yt3aD21ZYC+n02ix5CIggAJwBDAHcCKAomfHEwYP4hJBA0MUlpWQUEAFotIgcXO0sXbS0+O21TcwR1OzsiZV0DRXVLPWLHO29fDBwCYhCIqOp6ZloANSYk2TSJKRkU7OUG7U07ZScDZTrlSwNNasQc52UiXTsXTT51RRbdZ00e1L6AwbDI-GjaRlYObhmKTmGUWoGyrk0Gl06j2iksfEsiiRiiqZmO63ObQqfE0bgOlUUzz8-UCQ0+3zGf04vEUyRE6QWWUQOm0Nhhuk0HhhbWURwQbiIRnUOIOhmFty8Phe-gGQQ+IwAQqEAMYAa1gyBVYEB9PmmSWiD0rNh9z4Tks8JxfPUByImke8Msym21wMRNesrJIyYsGVoWQ2sEs1EetB8kQWmsfF0Meh8M0JVufLyml0Gnt9k5lluZs53il+FQEDgwZlhGDDP1YOO7QK6iKJW0ZWulWT7gMREsGY2LrqxXdZeIpHIFdDTIQOz5djUeweBl0mzcqnnA5J72GX1HIPH7LtfP2nfrdwXrncx-zniAA */
        id: "polyLine",
        initial: "idle",
        states : {
            idle: {
                on: {
                    MOUSECLICK: {
                        target: "drawing",
                        actions: "createLine"
                    }
                }
            },

            drawing: {
                on: {
                    MOUSEMOVE: {
                        target: "drawing",
                        internal: true,
                        actions: "setLastPoint",
                    },

                    MOUSECLICK: [{
                        target: "drawing",
                        internal: true,
                        actions: ["addPoint"]
                    }, {
                        target: "drawing",
                        internal: true,
                        cond: "pasPlein",
                        actions: "addPoint"
                    }],

                    Backspace: {
                        target: "drawing",
                        internal: true,
                        cond: "plusDeDeuxPoints",
                        actions: "removeLastPoint"
                    },

                    Escape: {
                        target: "idle",
                        actions: "abandon"
                    },

                    Enter: {
                        target: "idle",
                        actions: "saveLine",
                        cond: "plusDeDeuxPoints"
                    }
                }
            }
        }
    },
    // Quelques actions et guardes que vous pouvez utiliser dans votre machine
    {
        actions: {
            // Créer une nouvelle polyline
            createLine: (context, event) => {
                const pos = stage.getPointerPosition();
                polyline = new Konva.Line({
                    points: [pos.x, pos.y, pos.x, pos.y],
                    stroke: "red",
                    strokeWidth: 2,
                });
                layer.add(polyline);
            },
            // Mettre à jour le dernier point (provisoire) de la polyline
            setLastPoint: (context, event) => {
                const pos = stage.getPointerPosition();
                const currentPoints = polyline.points(); // Get the current points of the line
                const size = currentPoints.length;

                const newPoints = currentPoints.slice(0, size - 2); // Remove the last point
                polyline.points(newPoints.concat([pos.x, pos.y]));
                layer.batchDraw();
            },
            // Enregistrer la polyline
            saveLine: (context, event) => {
                const currentPoints = polyline.points(); // Get the current points of the line
                const size = currentPoints.length;
                // Le dernier point(provisoire) ne fait pas partie de la polyline
                const newPoints = currentPoints.slice(0, size - 2);
                polyline.points(newPoints);
                layer.batchDraw();
            },
            // Ajouter un point à la polyline
            addPoint: (context, event) => {
                const pos = stage.getPointerPosition();
                const currentPoints = polyline.points(); // Get the current points of the line
                const newPoints = [...currentPoints, pos.x, pos.y]; // Add the new point to the array
                polyline.points(newPoints); // Set the updated points to the line
                layer.batchDraw(); // Redraw the layer to reflect the changes
            },
            // Abandonner le tracé de la polyline
            abandon: (context, event) => {
                // Supprimer la variable polyline :
                polyline.remove();
                
            },
            // Supprimer le dernier point de la polyline
            removeLastPoint: (context, event) => {
                const currentPoints = polyline.points(); // Get the current points of the line
                const size = currentPoints.length;
                const provisoire = currentPoints.slice(size - 2, size); // Le point provisoire
                const oldPoints = currentPoints.slice(0, size - 4); // On enlève le dernier point enregistré
                polyline.points(oldPoints.concat(provisoire)); // Set the updated points to the line
                layer.batchDraw(); // Redraw the layer to reflect the changes
            },
        },
        guards: {
            // On peut encore ajouter un point
            pasPlein: (context, event) => {
                // Retourner vrai si la polyline a moins de 10 points
                // attention : dans le tableau de points, chaque point est représenté par 2 valeurs (coordonnées x et y)
                return polyline.points().length < MAX_POINTS * 2;
                
            },
            // On peut enlever un point
            plusDeDeuxPoints: (context, event) => {
                // Deux coordonnées pour chaque point, plus le point provisoire
                return polyline.points().length > 6;
            },
        },
    }
);

// On démarre la machine
const polylineService = interpret(polylineMachine)
    .onTransition((state) => {
        console.log("Current state:", state.value);
    })
    .start();
// On envoie les événements à la machine
stage.on("click", () => {
    polylineService.send("MOUSECLICK");
});

stage.on("mousemove", () => {
    polylineService.send("MOUSEMOVE");
});

// Envoi des touches clavier à la machine
window.addEventListener("keydown", (event) => {
    console.log("Key pressed:", event.key);
    // Enverra "a", "b", "c", "Escape", "Backspace", "Enter"... à la machine
    polylineService.send(event.key);
});
