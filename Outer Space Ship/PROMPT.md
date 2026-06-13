We are going to create an HTML and Javascript game. Create and generate the necessary files. The game should be a top-down 2d game, in outer space. The user plays as a ship - design a ship, as pixel-art. When the user holds the up arrow, the ship will move forward. When the user holds the left arrow, the ship will rotate left. When the user holds the right arrow, the ship will rotate right. If the ship has forward momentum then continue coasting after the up arrow is released. The ship should remain in the center of the canvas - other objects will move closer or further, based on the movement of the player. In space, there are hostile space stations. Each station is stationary, but shoots at the player. The player can shoot plasma balls, when the user presses the space bar.

Lets add some collision logic - station, shot, plasma, or ship are all known as “SpaceObject”. If a SpaceObject collides with any other space object, then remove the Collided objects.

I’ve undone those changes. Lets try again.

Add a ‘Level’. Globally accessible.
Level is incremented when the station is destroyed.
Level is decremented wheen the player is destroyed.
Display the level in the top right.