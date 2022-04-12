/* jshint esversion: 9 */
/* For dealing with spline curves */
/* global THREE, AFRAME */

import { LensflareElement } from 'three/examples/jsm/objects/Lensflare.js';
AFRAME.registerComponent('lens-flare', {
	schema: {
		texture: {
			documentation: 'Texture of the lensflare',
			default: 'https://threejs.org/examples/textures/lensflare/lensflare0.png',
			type: 'map'
		},
		size: {
			documentation: 'Size in pixels of the lensflare',
			type: 'map'
		},
		distance: {
			documentation: 'Distance from the light 0-1',
			default: 0
		},
		color: {
			documentation: 'Override color of the lensflare',
			type: 'color',
			default: 'white'
		},
	},
	init () {
		this.lensFlare = new LensflareElement();
		el.setObject3D('lensflare', this.lensFlare);
	},
	update(oldData={}) {
		for (const prop of ['texture', 'size', 'distance', 'color']) {
			const value = data[prop];
			if (oldData[prop] !== value) {
				if (prop === 'texture') {
					this.el.sceneEl.systems.material.loadTexture(value, { src: value }, function textureLoaded (texture) {
						this.lensFlare.texture = texture;
						AFRAME.utils.material.handleTextureEvents(self.el, texture);
					});
				} else if (prop === 'color') {
					this.lensFlare.color.set(value);
				} else {
					this.lensFlare[prop] = value;
				}
			}
		}
	},
	remove() {
		el.removeObject3D('lensflare');
	}
});
