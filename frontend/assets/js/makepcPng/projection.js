/*
projection.js, 2021-04-18, 西岡 芳晴 ( NISHIOKA Yoshiharu )
主にウェブメルカトル座表と緯度経度座標系の変換を行います．
・必要とするライブラリ
　無し
*/
'use strict';

//// 定数
const
	webMelR = 6378137,					// ウェブメルカトルでの地球半径
	webMelLatLimit = webMelToLatLng( { x: 0, y: 0 } ).lat;
										// ウェブメルカトルにおける緯度の限界

//// 緯度経度座標系関連
function latLngRadToDeg( latLngRad ) {
	return { lat: latLngRad.phi / Math.PI * 180, lng: latLngRad.lmbd / Math.PI * 180 };
}

function latLngDegToRad( latLng ) {
	return { phi: latLng.lat / 180 * Math.PI, lmbd: latLng.lng / 180 * Math.PI };
}

//// ウェブメルカトル座標系関連
function latLngRadToWebMel( latLngRadian, order = 8 ){
	const
		w = 2 ** ( order - 1 ),
		y0 = Math.log( Math.tan( Math.PI * ( 1 / 4 + latLngRadian.phi / Math.PI / 2 ) ) );

	return { x: ( latLngRadian.lmbd / Math.PI + 1 ) * w, y: ( 1 - y0 / Math.PI ) * w,
			order: order };
}

function webMelToLatLngRad( webMel ){
	let
		w,
		yy;

	webMel.order = webMel.order ?? 8;
	w = 2 ** webMel.order;
	yy = Math.atan( Math.pow( Math.E, ( 0.5 - webMel.y / w ) * 2 * Math.PI ) );
	return  { phi : yy * 2 - Math.PI / 2, lmbd: ( webMel.x / w * 2 - 1 ) * Math.PI };
}

function latLngToWebMel( latLng, order = 8 ){
	return  latLngRadToWebMel( latLngDegToRad( latLng ), order );
}

function webMelToLatLng( webMel ){
	return latLngRadToDeg( webMelToLatLngRad( webMel ) );
}

function webMelXToLng( x, order = 8 ){
	return x / ( 2 ** order ) * 360 - 180;
}

function webMelYToLat( y, order = 8 ){
	return Math.atan( Math.pow( Math.E, ( 0.5 - y / ( 2 ** order ) ) * 2 * Math.PI ) )
			 / Math.PI * 360 - 90;
}

export {
	webMelR, webMelLatLimit, latLngRadToDeg, latLngDegToRad,
	latLngRadToWebMel, webMelToLatLngRad, latLngToWebMel, webMelToLatLng, webMelXToLng, webMelYToLat
 };