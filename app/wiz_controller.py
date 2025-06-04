from pywizlight import wizlight, PilotBuilder
import asyncio


class WizController:
    def __init__(self, ip):
        self.light = wizlight(ip)

    async def execute_command(self, command):
        try:
            if command['action'] == 'turn_on':
                await self.light.turn_on()
                return "Lampe allumée"

            elif command['action'] == 'turn_off':
                await self.light.turn_off()
                return "Lampe éteinte"

            elif command['action'] == 'set_brightness':
                brightness = command.get('value', 50)
                brightness = max(10, min(100, brightness))  # Évite les valeurs extrêmes
                pilot = PilotBuilder(brightness=brightness)
                await self.light.send_pilot(pilot)
                return f"Luminosité réglée à {brightness}%"

            elif command['action'] == 'set_color':
                color = command.get('color', 'blanc')
                pilot = self._get_color_pilot(color)
                await self.light.send_pilot(pilot)
                return f"Couleur changée en {color}"

            elif command['action'] == 'combo':
                power = command.get('power')
                color = command.get('color', 'blanc')
                pilot = self._get_color_pilot(color)

                if power == 'on':
                    await self.light.turn_on()
                elif power == 'off':
                    await self.light.turn_off()

                await self.light.send_pilot(pilot)
                return f"Lampe {'allumée' if power == 'on' else 'éteinte'} avec couleur {color}"

            else:
                return "Commande non reconnue"

        except Exception as e:
            return f"Erreur : {str(e)}"

    def _get_color_pilot(self, color_name):
        color_map = {
            'rouge': PilotBuilder(rgb=(255, 0, 0)),
            'vert': PilotBuilder(rgb=(0, 255, 0)),
            'bleu': PilotBuilder(rgb=(0, 0, 255)),
            'jaune': PilotBuilder(rgb=(255, 255, 0)),
            'violet': PilotBuilder(rgb=(128, 0, 128)),
            'blanc': PilotBuilder(color_temp=4000),
        }
        return color_map.get(color_name.lower(), PilotBuilder(color_temp=4000))
