/*
canvas.js, 2021-04-17, 西岡 芳晴 ( NISHIOKA Yoshiharu )
CanvasのPNGからののロード及びCanvasとImageDataを相互に変換するライブラリ
・必要とするライブラリ
　load.js
●やること
・動作テスト
*/
'use strict';

import * as Load from './load.js';

async function load( url, dx = 0, dy = 0, dw, dh ){
	const
		img = await Load.image( url ),
		canvas = document.createElement( 'canvas' );

	canvas.width = dw ?? img.width - dx;
	canvas.height = dh ?? img.height - dy;
	canvas.getContext( '2d' ).drawImage( img, -dx, -dy );
	return canvas;
}

function fromImageData( imageData, dx = 0, dy = 0, dw, dh ){
	const
		canvas = document.createElement( 'canvas' );

	canvas.width = dw ?? imageData.width - dx;
	canvas.height =  dh ?? imageData.height - dy;
	canvas.getContext( '2d' ).putImageData( imageData, -dx, -dy );
	return canvas;
}

async function loadImageData( url, dx = 0, dy = 0, dw, dh ){
	return toImageData(await load( url, dx, dy, dw, dh ) );
}

function toImageData( canvas ){
	return canvas.getContext( '2d' ).getImageData( 0, 0, canvas.width, canvas.height );
}

async function toBlob( canvas ){
// CanvasをBlobに変換するプロミスを生成
	return new Promise( resolve => canvas.toBlob( b => resolve( b ) ) );
}

async function toArrayBuffer( canvas ){
// CanvasをArrayBufferに変換するプロミスを生成
	return ( await toBlob( canvas ) ).arrayBuffer();
}

export { load, fromImageData, loadImageData, toImageData, toBlob, toArrayBuffer }
