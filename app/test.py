from lifxlan import LifxLAN

lifx = LifxLAN()
lights = lifx.get_lights()
lamp = lights[0]

print(lamp)
