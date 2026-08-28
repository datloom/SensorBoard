/*
abl.js, 2021-04-05, 西岡 芳晴 ( NISHIOKA Yoshiharu )
// ab.js 2020-08-26版をモジュール化したバージョンです．
ArrayBufferLib:　ArrayBufferからシーケンシャルにデータを読み出すためのツール
現在基本機能実装済みのプロトタイプ
開発元: https://gsj-seamless.jp/png/ab/ab.js
●これから
・loadFromUrl0の速度検証
・バイト数を指定してのリーダー，ライターint, Uint8
・ビット呼び出し関数
・ドキュメント作成
*/

function getInt24( ab, littleEndian = true){
	let
		a = new Uint8Array( ab );

	if( littleEndian ) {
		return ( ( a[ 2 ] - 256 * ( a[ 2 ] >= 128 ) ) * 256 + a[ 1 ] ) * 256 + a[ 0 ];
	}else{
		return ( ( a[ 0 ] - 256 * ( a[ 0 ] >= 128 ) ) * 256 + a[ 1 ] ) * 256 + a[ 2 ];
	}
}	

function getUint24( ab, littleEndian = true ){
	let
		a = new Uint8Array( ab );

	if( littleEndian ) {
		return ( a[ 2 ] * 256 + a[ 1 ] ) * 256 + a[ 0 ];
	} else {
		return ( a[ 0 ] * 256 + a[ 1 ] ) * 256 + a[ 2 ];
	}
}	

const
	PointerView = class {
	constructor( buffer, littleEndian ){
		if( buffer instanceof Uint8Array ){
			this.dv = new DataView( buffer.buffer );
		} else {
			this.dv = new DataView( buffer );
		}
		this.littleEndian = littleEndian === undefined ? true : littleEndian;
		this.p = 0;
	};

	// プロパティ
	get buffer(){
		return this.dv.buffer;
	}
		
	get byteLength(){
		return this.dv.buffer.byteLength;
	}

	static loadFromUrl0( url, littleEndian = true ){	// 巨大配列非対応版，念のため残す
		return fetch( url ).then( r => r.arrayBuffer() )
				.then( ab => new PointerView( ab, littleEndian ) );
	}

	static async loadFromUrl( url, littleEndian = true ){		//巨大ファイル対応版
		const
			response = await fetch( url ),
//				maxSize = 2**26,		// デバッグ用
//				maxSize = 2**27,
			maxSize = 2**31,
//				maxSize = 2**31.5,		//  「Array buffer allocation failed」
			segments = [],
			reader = response.body.getReader(),
	    	results = [];
		let
			k = 0,
	    	k2 = 0,
	    	sumLength = 0,
	    	pos = 0;

		function readChunk(){
			return reader.read().then( function( chunk ) {
				if( !chunk.done ){
					length += chunk.value.length;
					segments.push( chunk.value );
					return readChunk();
				}
			} );
		}

		await readChunk();	
		do{
			if( k == segments.length || sumLength + segments[ k ].byteLength > maxSize){
				const
					whole = new Uint8Array( sumLength );

			    for( let i = k2; i < k; i++ ){
			        whole.set( new Uint8Array( segments[ i ] ), pos );
			        pos += segments[ i ].byteLength;
			    }
			    results.push( new PointerView( whole, littleEndian ) );
				k2 = k;
		        sumLength = 0;
				pos = 0;
		    }
		    if( k < segments.length ){
	    	    sumLength += segments[ k ].byteLength;
		    }
		} while( ++k <= segments.length );
		return ( results.length > 1 )?  results : results[ 0 ];
	};


	// クラス内のメソッドをlen回繰り返して結果を配列にして返します．
	multiRead( f, len ){
		if( len  === undefined ){
			return f.apply( this );
		} else {
			const
				a = new Array( len );

			for( let i = 0; i < len; i++ ){	
					// a.pushを利用するとout of Memoryが発生しやすい
				a[ i ] = f.apply( this );
			}
			return a;
		}
	}

	// vが配列でなければそのまま引数として与えて，関数をメソッドとして実行し，
	// vが配列ならば要素の数だけ，その要素を引数として関数をメソッドとして実行しします．
	multiWrite( f, v ){
		if( Array.isArray( v ) ){
			for( let i = 0; i < v.length; i++ ){
				f.call( this, v[ i ] )
			}
		} else {
			f.call( this,  v );
		}
	};

	// 読み込み
	readArrayBuffer( len ){
		const 
			v = this.dv.buffer.slice( this.p, this.p + len )

		this.p += len;
		return v;
	}

	readInt8( len ){
		if( len  === undefined ){
			return this.dv.getInt8( this.p++, this.littleEndian );
		} else {
//			return Array.from( new Int8Array( this.readArrayBuffer( len ) ) );
			return new Int8Array( this.readArrayBuffer( len ) );
		}
	}

	readInt16( len ){
		if( len  === undefined ){
			const
				v = this.dv.getInt16( this.p, this.littleEndian );

			this.p += 2;
			return v;
		} else {
			const
				a = new Int16Array( len );

			for( let i = 0; i < len; i++ ){	
				a[ i ] = this.dv.getInt16( this.p, this.littleEndian );
				this.p += 2;
			}
			return a;
		}
	}

	readInt24( len ){
		return this.multiRead( () => {
			return getInt24( this.readArrayBuffer( 3 ), this.littleEndian );
		}, len );
	}

	readInt32( len ){
		if( len  === undefined ){
			const
				v = this.dv.getInt32( this.p, this.littleEndian );

			this.p += 4;
			return v;
		} else {
			const
				a = new Int32Array( len );

			for( let i = 0; i < len; i++ ){	
				a[ i ] = this.dv.getInt32( this.p, this.littleEndian );
				this.p += 4;
			}
			return a;
		}
	}

	readBigInt( len ){
		return this.multiRead( () => {
			let
				a;

			if( this.littleEndian ){
				a = [ this.readInt32(), this.readUint32() ];
			} else {
				a = [ this.readUint32(), this.readInt32() ].reverse();
			}
			return BigInt( a[ 1 ] ) *  BigInt( 2 ** 32 ) + BigInt( a[ 0 ] );
		}, len );
	}

	readUint8( len ){
		if( len  === undefined ){
			return this.dv.getUint8( this.p++, this.littleEndian );
		} else {
//			return this.multiRead( this.readUint8, len );
//			return Array.from( new Uint8Array( this.readArrayBuffer( len ) ) );
			return new Uint8Array( this.readArrayBuffer( len ) );
		}
	}

	readUint16( len ){
		if( len  === undefined ){
			const
				v = this.dv.getUint16( this.p, this.littleEndian );

			this.p += 2;
			return v;
		} else {
			const
				a = new Uint16Array( len );

			for( let i = 0; i < len; i++ ){	
				a[ i ] = this.dv.getUint16( this.p, this.littleEndian );
				this.p += 2;
			}
			return a;
		}
/*		return this.multiRead( () => {
			const
				v = this.dv.getUint16( this.p, this.littleEndian );

			this.p += 2;
			return v;
		}, len );
*/
	}

	readUint24( len ){
		return this.multiRead( () => {
			return getUint24( this.readArrayBuffer( 3 ), this.littleEndian );
		}, len );
	}

	readUint32( len ){
		if( len  === undefined ){
			const
				v = this.dv.getInt32( this.p, this.littleEndian );

			this.p += 4;
			return v;
		} else {
			const
				a = new Uint32Array( len );

			for( let i = 0; i < len; i++ ){	
				a[ i ] = this.dv.getInt32( this.p, this.littleEndian );
				this.p += 4;
			}
			return a;
		}
/*
		return this.multiRead( () => {
			const
				v = this.dv.getUint32( this.p, this.littleEndian );

			this.p += 4;
			return v;
		}, len );
*/
	}

	readFloat32( len ){
		if( len  === undefined ){
			const
				v = this.dv.getFloat32( this.p, this.littleEndian );

			this.p += 4;
			return v;
		} else {
			const
				a = new Float32Array( len );

			for( let i = 0; i < len; i++ ){	
				a[ i ] = this.dv.getFloat32( this.p, this.littleEndian );
				this.p += 4;
			}
			return a;
		}
	}
	
	readFloat64( len ){
		if( len  === undefined ){
			const
				v = this.dv.getFloat64( this.p, this.littleEndian );

			this.p += 8;
			return v;
		} else {
			const
				a = new Float32Array( len );

			for( let i = 0; i < len; i++ ){	
				a[ i ] = this.dv.getFloat64( this.p, this.littleEndian );
				this.p += 8;
			}
			return a;
		}
	}
	
	readStr( len ){
		// TextDecoderはデフォルトで'utf-8'を使用します．
		return new TextDecoder().decode( new Uint8Array( this.readArrayBuffer( len ) ) );
//		return String.fromCharCode.apply( '', new Uint8Array( this.getArrayBuffer( len ) ) );
	}

	// 書き込み
	writeArrayBuffer( ab ){
		new Uint8Array( this.dv.buffer ).set( new Uint8Array( ab ), this.p );
		this.p += ab.byteLength;
	}

	writeInt8( v ){
		if( Array.isArray( v ) ){
			new Int8Array( this.dv.buffer ).set( v, this.p );
			this.p += v.length;
		} else {
			this.dv.setInt8( this.p++, v );
		}
	}

	writeInt16( v ){
		this.multiWrite( v => {
			this.dv.setInt16( this.p, v, this.littleEndian );
			this.p += 2;
		}, v );
		
	}

	writeInt32( v ){
		this.multiWrite( v => {
			this.dv.setInt32( this.p, v, this.littleEndian );
			this.p += 4;
		}, v )
	}

	writeBigInt( v ){
		this.multiWrite( v => {
			const
				a1 = v / BigInt( 2 ** 32 ),
				a2 = v - a1 * BigInt( 2 ** 32 );

			if( this.littleEndian ){
				this.writeUint32( Number( a2 ) );
				this.writeInt32(  Number( a1 ) );
			} else {
				this.writeInt32(  Number( a1 ) );
				this.writeUint32( Number( a2 ) );
			}
		}, v );
	}

	writeUint8( v ){
		if( Array.isArray( v ) ){
			new Uint8Array( this.dv.buffer ).set( v, this.p );
			this.p += v.length;
		} else {
			this.dv.setInt8( this.p++, v );
		}
	}

	writeUint16( v ){
		this.multiWrite( v => {
			this.dv.setUint16( this.p, v, this.littleEndian );
			this.p += 2;
		}, v )
	}

	writeUint32( v ){
		this.multiWrite( v => {
			this.dv.setUint32( this.p, v, this.littleEndian );
			this.p += 4;
		}, v )
	}

	writeFloat32( v ){
		this.multiWrite( v => {
			this.dv.setFloat32( this.p, v, this.littleEndian );
			this.p += 4;
		}, v )
	}
	
	writeFloat64( v ){
		this.multiWrite( v => {
			this.dv.setFloat64( this.p, v, this.littleEndian );
			this.p += 8;
		}, v )
	}
	
	writeStr( s ){
		const
			buf =  new TextEncoder().encode( s )

		new Uint8Array( this.dv.buffer ).set( buf, this.p );
		this.p += buf.length ;
	}

}

export { getInt24, getUint24, PointerView }