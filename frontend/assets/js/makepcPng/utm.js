/*0
grid.js, 2021-04-03, 西岡 芳晴 ( NISHIOKA Yoshiharu )
・必要とするライブラリ
geodessy(utm.js)
*/
'use strict';

import { default as Utm, LatLon } from './geodesy/utm.js';
import * as Projection from './projection.js';

function toLatLng( utm ){
	const
		ll = Utm.parse(　utm.zone + ' ' + utm.hemisphere + ' ' + utm.x + ' ' + utm.y ).toLatLon();

	return { lat: ll._lat, lng: ll._lon };
}

function fromLatLng( ll ){
	const
		utm = new LatLon( ll.lat, ll.lng ).toUtm();

	return { x: utm.easting, y: utm.northing, zone: utm.zone, hemisphere: utm.hemisphere };
}

// 関数　utmToWebMel
function toWebMel( utm, order = 8 ){
	const
		ll = toLatLng( utm );

	return Projection.latLngRadToWebMel( 
			{ phi: ll.lng / 180 * Math.PI, lmbd: ll.lat / 180 * Math.PI }, order );
}

function fromWebMel( webMel ){
	let
		llr,
		utm;

	webMel.order = webMel.order ?? 8;
	llr = Projection.webMelToLatLngRad( webMel );
	utm = new LatLon( llr.lmbd / Math.PI * 180, llr.phi / Math.PI * 180 ).toUtm();
	return  { x: utm.easting, y: utm.northing, zone: utm.zone, hemisphere: utm.hemisphere };
}

export { toLatLng, fromLatLng, toWebMel, fromWebMel };