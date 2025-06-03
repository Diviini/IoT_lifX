from lifxlan import Light
from lifxlan import LifxLAN

import os


class LifXController:


    def execute_command(self, command):
        lifx = LifxLAN()
        device = lifx.get_lights()[0]
        try:
            if command['action'] == 'turn_on':
                device.set_power("on")
                return "Lampe allumée"

            elif command['action'] == 'turn_off':

                device.set_power("off")
                return "Lampe éteinte"

            elif command['action'] == 'set_brightness':
                brightness = command.get('value', 50)
                device.set_brightness(brightness * 655.35)  # 0-65535
                return f"Luminosité réglée à {brightness}%"

            elif command['action'] == 'set_color':
                color = command.get('color', 'white')
                hue, sat, bright, kelvin = self._get_color_values(color)
                device.set_color([hue, sat, bright, kelvin])
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