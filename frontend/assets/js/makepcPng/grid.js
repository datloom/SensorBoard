/*
grid.js, 2021-04-17, 西岡 芳晴 ( NISHIOKA Yoshiharu )
Gridオブジェクト処理ライブラリ
・必要とするライブラリ
　STools( coords, load )
　netCDF.js
　ab.js
　gridCore.js
　gridProjectionjs
　utm.js
　chokkaku.js
　geodessy(utm.js)
●やること
・load.jsのFetch化
*/
'use strict';

import * as gridCore from './gridCore.js';
import * as gridProjection from './gridProjection.js';
import * as Canvas from './canvas.js';

class Grid {
	constructor( width, height, data ){
		if( isNaN( width ) ){
			const
				obj = width;

			this.width = obj.width;
			this.height = obj.height;
			data = obj.data;

			( obj.spacing == undefined ) || ( this.spacing = obj.spacing );
			( obj.left    == undefined ) || ( this.left = obj.left );
			( obj.top     == undefined ) || ( this.top = obj.top );
			( obj.right   == undefined ) || ( this.right = obj.right );
			( obj.bottom  == undefined ) || ( this.bottom = obj.bottom );
		} else {
			this.width = width;
			this.height = height
		}
		this.data = data ?? new Float32Array( width * height ).fill( NaN );
	}
	static async loadFromText( url, option ){
		return new Grid( await gridCore.loadFromText( url, option ) );
	}
	static async loadFromNetCDF( url, northPositive = true  ){
		return new Grid( await gridCore.loadFromNetCDF( url, northPositive ) );
	}
	static async loadFromPng( url, factor, offset, dx, dy, dw, dh ){
		return Grid.fromImageData( await Canvas.loadImageData( url, dx, dy, dw, dh ), factor, offset );
	}

	cut( bounds, yReverse = false ){	// left,top,right,bottom未対応
		return new Grid( gridCore.cut( this, bounds, yReverse = false ) );
	}
	async toTiles( processTile, zmax, zmin, tileSize = 256 ){
		return gridCore.toTiles( this, ( grid, coords ) => {
			return processTile( new Grid( grid ), coords);
		}, zmax, zmin, tileSize )
	}

	static fromImageData( imageData, factor, offset ){
		return new Grid( gridCore.fromImageData( imageData, factor, offset ) );
	}
	static fromCanvas( canvas, factor, offset ){
		return Grid.fromImageData( Canvas.toImageData( canvas ), factor, offset );
	}

	toImageData( factor, offset ){
		return gridCore.toImageData( this, factor, offset );
	}
	toCanvas( factor, offset ){
		return Canvas.fromImageData( this.toImageData( factor, offset ) );
	}

	latLngToWebMel( order = 8, bounds = null ){
		return new Grid( gridCore.latLngToWebMel( this, order, bounds ) );
	}
	chokkakuToWebMel( kei, order = 8, bounds = null, 	affine = false ){
		return new Grid( gridProjection.chokkakuToWebMel( this, kei, order, bounds,	affine ) );
	}
	utmToWebMel( zone, hemisphere = 'N', order = 8, bounds = null, affine = false ){
		return new Grid( gridProjection.utmToWebMel( 
			this, zone, hemisphere, order, bounds, affine ) );
	}
	toWebMel( grid, toWebMel, fromWebMel, bounds = null, affine = false ){
		return newGrid( toWebMel( this, toWebMel, fromWebMel, bounds = null, affine = false ) );
	}
}

export { Grid }
export * from './gridCore.js';
export * from './gridProjection.js';
