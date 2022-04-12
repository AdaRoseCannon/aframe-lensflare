(function (three) {
	'use strict';

	class Lensflare extends three.Mesh {

		constructor() {

			super( Lensflare.Geometry, new three.MeshBasicMaterial( { opacity: 0, transparent: true } ) );

			this.type = 'Lensflare';
			this.frustumCulled = false;
			this.renderOrder = Infinity;

			//

			const positionScreen = new three.Vector3();
			const positionView = new three.Vector3();

			// textures

			const tempMap = new three.FramebufferTexture( 16, 16, three.RGBAFormat );
			const occlusionMap = new three.FramebufferTexture( 16, 16, three.RGBAFormat );

			// material

			const geometry = Lensflare.Geometry;

			const material1a = new three.RawShaderMaterial( {
				uniforms: {
					'scale': { value: null },
					'screenPosition': { value: null }
				},
				vertexShader: /* glsl */`

				precision highp float;

				uniform vec3 screenPosition;
				uniform vec2 scale;

				attribute vec3 position;

				void main() {

					gl_Position = vec4( position.xy * scale + screenPosition.xy, screenPosition.z, 1.0 );

				}`,

				fragmentShader: /* glsl */`

				precision highp float;

				void main() {

					gl_FragColor = vec4( 1.0, 0.0, 1.0, 1.0 );

				}`,
				depthTest: true,
				depthWrite: false,
				transparent: false
			} );

			const material1b = new three.RawShaderMaterial( {
				uniforms: {
					'map': { value: tempMap },
					'scale': { value: null },
					'screenPosition': { value: null }
				},
				vertexShader: /* glsl */`

				precision highp float;

				uniform vec3 screenPosition;
				uniform vec2 scale;

				attribute vec3 position;
				attribute vec2 uv;

				varying vec2 vUV;

				void main() {

					vUV = uv;

					gl_Position = vec4( position.xy * scale + screenPosition.xy, screenPosition.z, 1.0 );

				}`,

				fragmentShader: /* glsl */`

				precision highp float;

				uniform sampler2D map;

				varying vec2 vUV;

				void main() {

					gl_FragColor = texture2D( map, vUV );

				}`,
				depthTest: false,
				depthWrite: false,
				transparent: false
			} );

			// the following object is used for occlusionMap generation

			const mesh1 = new three.Mesh( geometry, material1a );

			//

			const elements = [];

			const shader = LensflareElement.Shader;

			const material2 = new three.RawShaderMaterial( {
				uniforms: {
					'map': { value: null },
					'occlusionMap': { value: occlusionMap },
					'color': { value: new three.Color( 0xffffff ) },
					'scale': { value: new three.Vector2() },
					'screenPosition': { value: new three.Vector3() }
				},
				vertexShader: shader.vertexShader,
				fragmentShader: shader.fragmentShader,
				blending: three.AdditiveBlending,
				transparent: true,
				depthWrite: false
			} );

			const mesh2 = new three.Mesh( geometry, material2 );

			this.addElement = function ( element ) {

				elements.push( element );

			};

			//

			const scale = new three.Vector2();
			const screenPositionPixels = new three.Vector2();
			const validArea = new three.Box2();
			const viewport = new three.Vector4();

			this.onBeforeRender = function ( renderer, scene, camera ) {

				renderer.getCurrentViewport( viewport );

				const invAspect = viewport.w / viewport.z;
				const halfViewportWidth = viewport.z / 2.0;
				const halfViewportHeight = viewport.w / 2.0;

				let size = 16 / viewport.w;
				scale.set( size * invAspect, size );

				validArea.min.set( viewport.x, viewport.y );
				validArea.max.set( viewport.x + ( viewport.z - 16 ), viewport.y + ( viewport.w - 16 ) );

				// calculate position in screen space

				positionView.setFromMatrixPosition( this.matrixWorld );
				positionView.applyMatrix4( camera.matrixWorldInverse );

				if ( positionView.z > 0 ) return; // lensflare is behind the camera

				positionScreen.copy( positionView ).applyMatrix4( camera.projectionMatrix );

				// horizontal and vertical coordinate of the lower left corner of the pixels to copy

				screenPositionPixels.x = viewport.x + ( positionScreen.x * halfViewportWidth ) + halfViewportWidth - 8;
				screenPositionPixels.y = viewport.y + ( positionScreen.y * halfViewportHeight ) + halfViewportHeight - 8;

				// screen cull

				if ( validArea.containsPoint( screenPositionPixels ) ) {

					// save current RGB to temp texture

					renderer.copyFramebufferToTexture( screenPositionPixels, tempMap );

					// render pink quad

					let uniforms = material1a.uniforms;
					uniforms[ 'scale' ].value = scale;
					uniforms[ 'screenPosition' ].value = positionScreen;

					renderer.renderBufferDirect( camera, null, geometry, material1a, mesh1, null );

					// copy result to occlusionMap

					renderer.copyFramebufferToTexture( screenPositionPixels, occlusionMap );

					// restore graphics

					uniforms = material1b.uniforms;
					uniforms[ 'scale' ].value = scale;
					uniforms[ 'screenPosition' ].value = positionScreen;

					renderer.renderBufferDirect( camera, null, geometry, material1b, mesh1, null );

					// render elements

					const vecX = - positionScreen.x * 2;
					const vecY = - positionScreen.y * 2;

					for ( let i = 0, l = elements.length; i < l; i ++ ) {

						const element = elements[ i ];

						const uniforms = material2.uniforms;

						uniforms[ 'color' ].value.copy( element.color );
						uniforms[ 'map' ].value = element.texture;
						uniforms[ 'screenPosition' ].value.x = positionScreen.x + vecX * element.distance;
						uniforms[ 'screenPosition' ].value.y = positionScreen.y + vecY * element.distance;

						size = element.size / viewport.w;
						const invAspect = viewport.w / viewport.z;

						uniforms[ 'scale' ].value.set( size * invAspect, size );

						material2.uniformsNeedUpdate = true;

						renderer.renderBufferDirect( camera, null, geometry, material2, mesh2, null );

					}

				}

			};

			this.dispose = function () {

				material1a.dispose();
				material1b.dispose();
				material2.dispose();

				tempMap.dispose();
				occlusionMap.dispose();

				for ( let i = 0, l = elements.length; i < l; i ++ ) {

					elements[ i ].texture.dispose();

				}

			};

		}

	}

	Lensflare.prototype.isLensflare = true;

	//

	class LensflareElement {

		constructor( texture, size = 1, distance = 0, color = new three.Color( 0xffffff ) ) {

			this.texture = texture;
			this.size = size;
			this.distance = distance;
			this.color = color;

		}

	}

	LensflareElement.Shader = {

		uniforms: {

			'map': { value: null },
			'occlusionMap': { value: null },
			'color': { value: null },
			'scale': { value: null },
			'screenPosition': { value: null }

		},

		vertexShader: /* glsl */`

		precision highp float;

		uniform vec3 screenPosition;
		uniform vec2 scale;

		uniform sampler2D occlusionMap;

		attribute vec3 position;
		attribute vec2 uv;

		varying vec2 vUV;
		varying float vVisibility;

		void main() {

			vUV = uv;

			vec2 pos = position.xy;

			vec4 visibility = texture2D( occlusionMap, vec2( 0.1, 0.1 ) );
			visibility += texture2D( occlusionMap, vec2( 0.5, 0.1 ) );
			visibility += texture2D( occlusionMap, vec2( 0.9, 0.1 ) );
			visibility += texture2D( occlusionMap, vec2( 0.9, 0.5 ) );
			visibility += texture2D( occlusionMap, vec2( 0.9, 0.9 ) );
			visibility += texture2D( occlusionMap, vec2( 0.5, 0.9 ) );
			visibility += texture2D( occlusionMap, vec2( 0.1, 0.9 ) );
			visibility += texture2D( occlusionMap, vec2( 0.1, 0.5 ) );
			visibility += texture2D( occlusionMap, vec2( 0.5, 0.5 ) );

			vVisibility =        visibility.r / 9.0;
			vVisibility *= 1.0 - visibility.g / 9.0;
			vVisibility *=       visibility.b / 9.0;

			gl_Position = vec4( ( pos * scale + screenPosition.xy ).xy, screenPosition.z, 1.0 );

		}`,

		fragmentShader: /* glsl */`

		precision highp float;

		uniform sampler2D map;
		uniform vec3 color;

		varying vec2 vUV;
		varying float vVisibility;

		void main() {

			vec4 texture = texture2D( map, vUV );
			texture.a *= vVisibility;
			gl_FragColor = texture;
			gl_FragColor.rgb *= color;

		}`

	};

	Lensflare.Geometry = ( function () {

		const geometry = new three.BufferGeometry();

		const float32Array = new Float32Array( [
			- 1, - 1, 0, 0, 0,
			1, - 1, 0, 1, 0,
			1, 1, 0, 1, 1,
			- 1, 1, 0, 0, 1
		] );

		const interleavedBuffer = new three.InterleavedBuffer( float32Array, 5 );

		geometry.setIndex( [ 0, 1, 2,	0, 2, 3 ] );
		geometry.setAttribute( 'position', new three.InterleavedBufferAttribute( interleavedBuffer, 3, 0, false ) );
		geometry.setAttribute( 'uv', new three.InterleavedBufferAttribute( interleavedBuffer, 2, 3, false ) );

		return geometry;

	} )();

	/* jshint esversion: 9 */


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
				const value = this.data[prop];
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

})(THREE);
//# sourceMappingURL=aframe-lensflare.js.map
