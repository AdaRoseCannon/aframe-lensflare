/* jshint esversion: 9 */
/* For dealing with spline curves */
/* global THREE, AFRAME */

import { LensflareElement, Lensflare } from 'three/examples/jsm/objects/Lensflare.js';


AFRAME.registerComponent('lens-flare', {
	schema: {},
	init() {
		this.lensFlare = new Lensflare();
		this.el.setObject3D('lensflare', this.lensFlare);
	},
	remove() {
		this.el.removeObject3D('lensflare', this.lensFlare);
	}
});

documentation:
console.log(`Configure each part of the lens flare`);
AFRAME.registerComponent('lens-flare-element', {
	schema: {
		texture: {
			description: 'Texture of the lensflare',
			default: 'https://threejs.org/examples/textures/lensflare/lensflare0.png',
			type: 'map'
		},
		size: {
			description: 'Size in pixels of the lensflare',
			type: 'map'
		},
		distance: {
			description: 'Distance from the light 0-1',
			default: 0
		},
		color: {
			description: 'Override color of the lensflare',
			type: 'color',
			default: 'white'
		},
	},
	init () {
		this.lensFlare = new LensflareElement();
		const parent = this.el.components['lens-flare'] || this.el.parentNode.components['lens-flare'];
		parent.lensFlare.addElement(this.lensFlare);
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
		this.el.removeObject3D('lensflare');
	}
});
