// download.js, 2021-03-26, 西岡 芳晴 ( NISHIOKA Yoshiharu )
// downloadの実装
// 必要とするライブラリ：無し
"use strict";

const
	Download = {};

function set( link, data, filename, option ){
// linkで指定したa要素をクリックしたときにdataをダウンロードするようにします
// linkはa要素そのものまたはIDを表す文字列を指定します
// optionオブジェクトでは，typeプロパティでファイルタイプを指定します
// デフォルトは'text/plain'です
// 型付き配列の場合は'application/octet-stream'を指定します
// opitonオブジェクトは，内部でnew Blob()の第2引数に渡されます．
	if( typeof link == 'string' ){
		link = document.querySelector( '#' + link );
	}
	if( !option ){
		option = { type : 'text/plain' };
	}
	link.download = filename;
	link.href = '';	// ダミー．これを設定しないとリンクにならない
	link.addEventListener( 'click', function( event ){
		var
			blob;

		if ( Blob ) {
	    	blob = new Blob( [ data ], option );
		    if ( window.navigator.msSaveBlob ) { 
		        window.navigator.msSaveBlob( blob, filename ); 
		    } else {
				event.target.href = window.URL.createObjectURL( blob );
		    }
		} else {
	//		console.log( 'blob使用不可' );	// デバッグ用
		}	
		data = null;
	} );
}

function setOctetStream( link, data, filename ){
// linkで指定したa要素をクリックしたときにdataをOctetStreamでダウンロードするようにします
	set( link, data, filename,{ type: 'application/octet-stream' } );
}

function data( data, filename, option ){
// dataをfilenameでダウンロードします
// optionオブジェクトでは，typeプロパティでMIMEタイプを指定します．
// デフォルトは'text/plain'です．
// 型付き配列の場合は'application/octet-stream'を指定します
// opitonオブジェクトは，内部でnew Blob()の第2引数に渡されます．
	var
		link = document.createElement( 'a' );

	document.body.append( link );
	set( link, data, filename, option );

	//自動保存
	link.click();
	// データ削除
	link.removeAttribute( 'href' );
	document.body.removeChild( link );
//	link.addEventListener( 'click', clickEvent );	//中身が削除されたか確認用
}

function octetStream( data_, filename ){
//  dataをapplication/octet-stream, filenameでダウンロードします
	data( data_, filename,  { type: 'application/octet-stream' }  );
}

function canvas( canvas, filename, mimeType ){
// canvas filenameでダウンロードします
// mimeTypeには画像フォーマットを指定し，デフォルトは'image/png'です．
	mimeType = ( mimeType ) ? mimeType : 'image/png';
	return canvas.toBlob( function( blob ){
		data( blob, filename )
	}, mimeType );
}

export { set, setOctetStream, data, octetStream, canvas }
