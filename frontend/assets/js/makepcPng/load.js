/* load.js, 2021-04-09, 西岡 芳晴 ( NISHIOKA Yoshiharu )
STools.loadsの実装
URLを指定してファイルをロードする関数を提供
・必要とするライブラリ
　無し
●やること
Fetchを使って全面的に書き直し
*/
"use strict";

function request( method, url, option ){
// XMLHttpRequestをリクエストするプロミスを生成
// loadイベントが発生するとXMLHttpRequestオブジェクトが渡される
// ただし，Status code 400以上のレスポンスコード（400 Bad Request等）のときは，
// Rejectされ，XMLHttpRequestオブジェクトが渡される．
// error, timeout, abortイベントが発生したときはRejectされ，
// イベントオブジェクトが渡される
	return new Promise( function( resolve, reject ) {
		var
			httpObj = new XMLHttpRequest();

		httpObj.open( method, url );
		if( option ){
			if ( option.responseType ) {
				httpObj.responseType = option.responseType
			}
		}
		httpObj.onload = function(){
			if ( httpObj.status < 400) {
				resolve( this );
			} else {
				reject( this );
			}
		}
		httpObj.onerror = function( event ){
			reject( event );
		}
		httpObj.ontimeout = function( event ){
			reject( event );
		}
		httpObj.onabort = function( event ){
			reject( event );
		}
		httpObj.send();
	} );
};

function url( url, option ){
// XMLHttpRequestを使ってファイルをロードするプロミスを生成
// 成功するとXMLHttpRequestオブジェクトが返される
// Status code 400以上のレスポンスコード（400 Bad Request等）のときは，
// Rejectされ，XMLHttpRequestオブジェクトが返される．
// XMLHttpRequestでerror, timeout, abortイベントが発生したときはRejectされ，
// イベントオブジェクトが渡される
	return request( 'get', url, option );
};

function head( url ){
// XMLHttpRequestを使ってファイルのヘッダをリクエストするプロミスを生成
// 成功するとXMLHttpRequestオブジェクトが渡される
// Status code 400以上のレスポンスコード（400 Bad Request等）のときは，
// Rejectされ，XMLHttpRequestオブジェクトが渡される
// XMLHttpRequestでerror, timeout, abortイベントが発生したときはRejectされ，
// イベントオブジェクトが渡される
	return request( 'head', url );
}

function json( url_ ){
// JSONファイルをロードするプロミスを生成
// Status code 400以上のレスポンスコード（400 Bad Request等）のときは，
// Rejectされ，XMLHttpRequestオブジェクトそのものが返される．
// XMLHttpRequestそのものでエラーが発生したときは，Rejectされ，
// そのエラーオブジェクトが返る
// JSONへの解析でエラーが発生した場合は，Rejectされ
// そのエラーオブジェクトが返る
	return url( url_ ).then( function( obj ){
		try {
			return JSON.parse( obj.responseText );
		} catch( e ) {
			return Promise.reject( e );
		}
	} );
};

// テキストファイルをロードするプロミスを生成します
// 改行コードは\r,\nいずれも使用できます．
function text( url_ ){
	return url( url_ ).then( function( request ) {
		return lineSeparate( request.response );
	} );
};


async function tsv( url_, separator ){
	try {
		return textSeparate( await ( await fetch( url_ ) ).text(), separator );
	} catch( e ) {
		return Promise.reject( e );
	}
}

function html( url_ ){
// htmlを非同期でロードするプロミスを生成
// 成功するとDOMオブジェクトを返す
// ※テキストで取得したい場合はload.urlを使用してください．
	return url( url_, { responseType: 'document' } ).then(
		function( obj ){
			if ( obj.responseXML ){
				return obj.responseXML;
			} else {
				return Promise.reject( obj );
			}
		}
	);
};

function arrayBuffer( url_, option ){
	option = option ? option: {};
	option.responseType = 'arraybuffer';
	return url( url_, option );
};

function blob( url_, option ){
	option = option ? option: {};
	option.responseType = 'bolb';
	return url( url_, option );
};

async function image( url ){
// 画像ファイルをロードするプロミスを生成
// 取得に失敗したときは，img.onerrorの引数に渡される
// エラーオブジェクトを返す．
// （失敗したときのステイスタスコード等は取得できない）
	return new Promise( function( resolve, reject) {
		var
			img = new Image();

	    img.crossOrigin = 'anonymous';
	    img.onload = function() {
	    	resolve( img );
	    };
	    img.onerror = function( e ) {
	    	reject( e );
	    }
		img.src = url;
	} );
};

async function imageData( url, bounds ){
// 画像ファイルをロードし，結果を受け取るためのプロミスを生成
// 成功時には，ImageDataオブジェクト（getImageData()で得られる）を受け取る
// 失敗時には，下流のimg.onerrorの引数に渡されるエラーオブジェクトを受け取る
	const
		img = await image( url ),
		canvas = document.createElement( 'Canvas' ),
		ctx = canvas.getContext( '2d' );

	if( !bounds ){
		bounds = [ 0, 0, img.width, img.height ];
	}
	canvas.width = bounds[ 2 ];
	canvas.height = bounds[ 3 ];
	ctx.drawImage( img, -bounds[ 0 ], -bounds[ 1 ] );
	return ctx.getImageData( 0, 0, bounds[ 2 ], bounds[ 3 ] );
}

function imageToInt( data, signed ){
// imageDataを整数値に変換します
// signed（省略可，デフォルトfalse）にtrueを設定すると符号付として返す
	var
//		value = new Array( data.width * data.height );
		value = new Int32Array( data.width * data.height );

	for( var i = 0; i < value.length; i++ ){
		var
			dt = data.data[ i * 4 ];

		if( data.data[ i * 4 + 3 ] !== 0 ) {
			if( signed && ( dt > 128 ) ){
				dt -= 256;
			}
			value[ i ] = dt * 256 * 256 + data.data[ i * 4 + 1 ] * 256 
					+ data.data[ i * 4 + 2 ];
		}
	}
	return { width: data.width, height: data.height, value: value };
}

function imageInt( url, signed, bounds ){
// 画像ファイルをロードし，結果を整数値として受け取るためのプロミスを生成
// signed（省略可，デフォルトfalse）にtrueを設定すると符号付として返す
// 不透明度が0のピクセルにはundefinedがセットされる
// 成功時には，整数値配列を含むオブジェクトを受け取る
// 失敗時には，下流のimg.onerrorの引数に渡されるイベントオブジェクトを受け取る
	return imageData( url, bounds ).then( function( data ){
		return imageToInt( data, signed );
	} );
}
function imageColor( url ){
// 画像ファイルをロードし，結果をColorオブジェクトとして受け取るプロミスを生成
// 不透明度が0のピクセルにはundefinedがセットされる
// 成功時には，Colorオブジェクト配列を含むオブジェクトを受け取る
// 失敗時には，下流のimg.onerrorの引数に渡されるイベントオブジェクトを受け取る
	return imageData( url ).then( function( data ){
		var
			d = data.data,
			colors = new Array( data.width * data.height );
		
		for( var i = 0; i < colors.length; i++ ){
			colors[ i ] = { r: d[ i * 4 ], g: d[ i * 4 + 1 ], b: d[ i * 4 + 2 ],
					a: d[ i * 4 + 3 ] }
		}
		return { width: data.width, height: data.height, colors: colors }
	} );
}

function imageValue( url, signed, na, f, offset ){
// 画像ファイルをロードし，結果を実数値として受け取るためのプロミスを生成
// signed（省略可，デフォルトfalse）にtrueを設定すると符号付きとして処理
// na（省略可，デフォルト無し）に値を設定すると無効値として処理
// f（省略可，デフォルト1）には係数，offset（省略可，デフォルト0）にはオフセットを指定
// 返す値は v * f + offsetで計算される
// 成功時には，実数値配列を含むオブジェクトを受け取る
// 失敗時には，下流のimg.onerrorの引数に渡されるイベントオブジェクトを受け取る
	// デフォルト値設定
	signed = ( signed == undefined ) ? false : signed;
	f = ( f == undefined ) ? 1 : f;
	offset = ( offset == undefined ) ? 0 : offset;
	return imageInt( url ).then( function( iv ){
		iv.value = iv.value.map( function( v ){
			// 符号処理
			if( v !== undefined && signed && ( v >= 1 << 23 ) ) {
				v -= 1 << 24;
			}
			// 無効値処理
			( v == na ) ? v = undefined : '';
			return ( v == undefined ) ? v : v * f + offset;
		} );
		return iv;
	} ) 
}

// 文字列を改行コードで分離します
// 改行コードは\r,\nいずれも使用できます．
function lineSeparate( text ){
	return text.split( '\n' ).map( function( line ){
		if ( line.slice( - 1 ) == '\r' ){	// 末尾の復帰コードを削除
			line = line.slice( 0, -1 );
		}
		return line;
	} );
}

// TSVテキストをseparatorで分離して配列として返します．
function textSeparate( text, separator ){
	separator = ( separator == undefined ) ? '\t': separator;
	return lineSeparate( text ).map( function( line ){
		return line.split( separator );
	} );
}

export { request, url, head, json, text, tsv, html, arrayBuffer, blob,
		image, imageData, imageToInt, imageInt, imageColor, imageValue, lineSeparate, textSeparate };