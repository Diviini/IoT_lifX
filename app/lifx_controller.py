from lifxlan import Light
import os


class LifXController:
    def __init__(self):
        self.ip = os.getenv('LIFX_IP')
        self.mac = os.getenv('LIFX_MAC')
        self.light = Light(self.mac, self.ip)

    def execute_command(self, command):
        try:
            if command['action'] == 'turn_on':
                self.light.set_power("on")
                return "Lampe allumée"

            elif command['action'] == 'turn_off':
                self.light.set_power("off")
                return "Lampe éteinte"

            elif command['action'] == 'set_brightness':
                brightness = command.get('value', 50)
                self.light.set_brightness(brightness * 655.35)  # 0-65535
                return f"Luminosité réglée à {brightness}%"

            elif command['action'] == 'set_color':
                color = command.get('color', 'white')
                hue, sat, bright, kelvin = self._get_color_values(color)
                self.light.set_color([hue, sat, bright, kelvin])
                return f"Couleur changée en {color}"

            else:
                return "Commande non reconnue"

        except Exception as e:
            return f"Erreur: {str(e)}"

    def _get_color_values(self, color_name):
        colors = {
            'rouge': [0, 65535, 65535, 3500],
            'bleu': [43690, 65535, 65535, 3500],
            'vert': [21845, 65535, 65535, 3500],
            'jaune': [10922, 65535, 65535, 3500],
            'violet': [54613, 65535, 65535, 3500],
            'blanc': [0, 0, 65535, 4000],
        }
        return colors.get(color_name.lower(), colors['blanc'])