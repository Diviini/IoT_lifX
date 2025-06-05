import asyncio
from pywizlight import wizlight, PilotBuilder, discovery
from get_broadcast import get_broadcast_space


async def initialize_light():
    print("🔍 Initialisation de la lampe WiZ...")
    broadcast_ip = get_broadcast_space()
    print(f"🔎 Broadcast utilisé : {broadcast_ip}")
    bulbs = await discovery.discover_lights(broadcast_space=broadcast_ip)
    if not bulbs:
        raise Exception("Aucune lampe WiZ détectée sur le réseau.")
    return wizlight(bulbs[0].ip)


class WizController:

    async def execute_command(self, command):
        try:
            # Initialiser la lampe à chaque commande
            light = await initialize_light()
        except Exception as e:
            return f"Erreur d'initialisation : {str(e)}"

        try:
            action = command.get('action')

            if action == 'turn_on':
                await light.turn_on()
                return "Lampe allumée"

            elif action == 'turn_off':
                await light.turn_off()  # Correction: light au lieu de self.light
                return "Lampe éteinte"

            elif action == 'set_brightness':
                brightness = command.get('value', 50)
                level = max(10, min(255, int(brightness / 100 * 255)))
                await light.turn_on(PilotBuilder(brightness=level))  # Correction: light au lieu de self.light
                return f"Luminosité réglée à {brightness}%"

            elif action == 'increase_brightness':
                state = await light.updateState()  # Correction: light au lieu de self.light
                current = state.get_brightness()
                new_level = min(255, current + 30)
                await light.turn_on(PilotBuilder(brightness=new_level))  # Correction: light au lieu de self.light
                return f"Luminosité augmentée à {int(new_level / 2.55)}%"

            elif action == 'decrease_brightness':
                state = await light.updateState()  # Correction: light au lieu de self.light
                current = state.get_brightness()
                new_level = max(10, current - 30)
                await light.turn_on(PilotBuilder(brightness=new_level))  # Correction: light au lieu de self.light
                return f"Luminosité diminuée à {int(new_level / 2.55)}%"

            elif action == 'set_color':
                color = command.get('color', 'blanc').lower()
                rgb = self._get_rgb_color(color)
                await light.turn_on(PilotBuilder(rgb=rgb))  # Correction: light au lieu de self.light
                return f"Couleur changée en {color}"

            elif action == 'unknown':
                return f"Commande non reconnue : \"{command.get('text', '')}\""

            else:
                return f"Action non prise en charge : {action}"

        except Exception as e:
            return f"Erreur lors de l'exécution : {str(e)}"

    def _get_rgb_color(self, name):
        colors = {
            'rouge': (255, 0, 0),
            'vert': (0, 255, 0),
            'bleu': (0, 0, 255),
            'jaune': (255, 255, 0),
            'violet': (180, 0, 255),
            'blanc': (255, 255, 255),
            'orange': (255, 140, 0),
            'rose': (255, 105, 180),
            'cyan': (0, 255, 255),
        }
        return colors.get(name, colors['blanc'])