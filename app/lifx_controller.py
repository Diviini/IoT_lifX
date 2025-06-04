from lifxlan import LifxLAN

class LifXController:

    def execute_command(self, command):
        lifx = LifxLAN()
        lights = lifx.get_lights()

        if not lights:
            return "Aucune lampe détectée"

        device = lights[0]

        try:
            action = command.get('action')

            if action == 'turn_on':
                device.set_color([0, 0, 30000, 3500], rapid=True)
                return "Lampe allumée"

            elif action == 'turn_off':
                device.set_power("off")
                return "Lampe éteinte"

            elif action == 'set_brightness':
                brightness = command.get('value', 50)
                device.set_brightness(int(brightness * 655.35))
                return f"Luminosité réglée à {brightness}%"

            elif action == 'increase_brightness':
                _, _, current, _ = device.get_color()
                new_value = min(65535, current + 5000)
                device.set_color([0, 0, new_value, 3500])
                return f"Luminosité augmentée à {int(new_value / 655.35)}%"

            elif action == 'decrease_brightness':
                _, _, current, _ = device.get_color()
                new_value = max(0, current - 5000)
                device.set_color([0, 0, new_value, 3500])
                return f"Luminosité diminuée à {int(new_value / 655.35)}%"

            elif action == 'set_color':
                color = command.get('color', 'blanc')
                hue, sat, bright, kelvin = self._get_color_values(color)
                device.set_color([hue, sat, bright, kelvin])
                return f"Couleur changée en {color}"

            elif action == 'unknown':
                return f"Commande non reconnue : \"{command.get('text', '')}\""

            else:
                return f"Action non prise en charge : {action}"

        except Exception as e:
            return f"Erreur lors de l'exécution : {str(e)}"

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
