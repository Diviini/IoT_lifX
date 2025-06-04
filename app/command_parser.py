import re


class CommandParser:
    def parse(self, text):
        text = text.lower()

        # Commandes d'allumage/extinction
        if any(word in text for word in ['allume', 'allumer', 'active']):
            return {'action': 'turn_on'}

        for color in ['rouge', 'bleu', 'vert', 'jaune', 'violet', 'blanc']:
            if color in text:
                return {'action': 'set_color', 'color': color}

        if any(word in text for word in ['éteins', 'éteindre', 'ferme']):
            return {'action': 'turn_off'}

        # Luminosité
        brightness_match = re.search(r'(\d+)\s*%|luminosité|brightness', text)
        if brightness_match or 'luminosité' in text:
            value = 50  # défaut
            if brightness_match and brightness_match.group(1):
                value = int(brightness_match.group(1))
            return {'action': 'set_brightness', 'value': min(100, max(0, value))}

        # Couleurs
        colors = ['rouge', 'bleu', 'vert', 'jaune', 'violet', 'blanc']
        for color in colors:
            if color in text:
                return {'action': 'set_color', 'color': color}

        return {'action': 'unknown', 'text': text}