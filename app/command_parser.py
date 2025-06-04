import re

class CommandParser:
    def parse(self, text):
        text = text.lower().strip()

        # Commandes d'allumage/extinction
        if any(word in text for word in ['allume', 'allumer', 'active', 'ouvre']):
            return {'action': 'turn_on'}

        if any(word in text for word in ['éteins', 'éteindre', 'ferme']):
            return {'action': 'turn_off'}

        if any(word in text for word in ['baisse', 'diminue', 'réduit', 'bisous']):
            return {'action': 'decrease_brightness'}

        if any(word in text for word in ['augmente', 'augment', 'monte', 'boost']):
            return {'action': 'increase_brightness'}

        brightness_match = re.search(r'(\d+)\s*%', text)
        if brightness_match:
            value = int(brightness_match.group(1))
            return {'action': 'set_brightness', 'value': min(100, max(0, value))}

        if 'luminosité' in text or 'brightness' in text:
            return {'action': 'set_brightness', 'value': 50}  # valeur par défaut

        colors = ['rouge', 'bleu', 'vert', 'jaune', 'violet', 'blanc']
        for color in colors:
            if color in text:
                return {'action': 'set_color', 'color': color}

        return {'action': 'unknown', 'text': text}
