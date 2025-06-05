import re

class CommandParser:
    def parse(self, text):
        text = text.lower().strip()

        # Commandes d'allumage/extinction
        if any(word in text for word in [
            'allume', 'allumer', 'active', 'activer', 'ouvre', 'ouvrir',
            'on', 'start', 'turn on', 'switch on', 'power on', 'enable',
            'lights on', 'light on', 'launch', 'begin', 'go on',
            'démarre', 'demarre', 'enclenche', 'mets en marche', 'met en marche'
        ]):
            return {'action': 'turn_on'}

        if any(word in text for word in [
            'éteins', 'eteins', 'éteindre', 'eteindre', 'ferme', 'fermer',
            'off', 'of' , 'stop', 'turn off', 'turn of', 'switch off', 'power off', 'disable',
            'lights off', 'light off', 'shut down', 'cut', 'kill switch',
            'arrête', 'arrete', 'désactive', 'desactive', 'éteint', 'eteint', 'coupe', 'couper'
        ]):
            return {'action': 'turn_off'}

        if any(word in text for word in [
            'baisse', 'baisser', 'diminue', 'diminuer', 'réduit', 'réduire',
            'decrease', 'lower', 'down', 'reduce', 'less bright', 'light down',
            'atténue', 'attenue', 'descend', 'descendre', 'drop', 'weaken', 'fade'
        ]):
            return {'action': 'decrease_brightness'}

        if any(word in text for word in [
            'augmente', 'augmenter', 'monte', 'monter', 'boost', 'booste',
            'increase', 'raise', 'up', 'more bright', 'light up', 'brighter',
            'hausse', 'renforce', 'intensifie', 'intensifier', 'stronger', 'strong light'
        ]):
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
