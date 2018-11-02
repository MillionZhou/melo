/**
 * Created by MinLan Zhou on 2018/2/28.
 * E-mail:ml_zhou2008@sina.com
 */

var BinaryBuffer = {
    reSet: function(){
        //读数据
        this.rpos = 0; //读位置
        //写入的最终位置
        this.wpos = 0;
        this.bpos = 0; //写入的当前位置备份
        //这里需要考虑空间容量
        this.wBuffer = null;
        this.rBuffer = null;
    },

    beginPack: function(){
        this.wBuffer = new DataView(new ArrayBuffer(1024));
        this.wpos = 0;
    },
	
    //write
    checkWriteCap: function(slen){
        if(this.wpos + slen > this.wBuffer.byteLength){
            var checkBuffer = new DataView(new ArrayBuffer(this.wBuffer.byteLength + slen + 512));
            for(var i = 0; i < this.wpos; i++){
                checkBuffer.setUint8(i,this.wBuffer.getUint8(i));
            }
            this.wBuffer = checkBuffer;
        }
    },
	
    getStringByteSize: function(data){
        data = data.replace(/\r\n/g,"\n");
        var nsize = 0;
        for (var n = 0; n < data.length; n++) {
            var c = data.charCodeAt(n);
            if(c < 128){
                nsize += 1;
            }else if((c > 127) && (c < 2048)){
                nsize += 2;
            }else{
                nsize += 3;
            }
        }
        return nsize;
    },
	
    writeByte: function(data) {
        this.checkWriteCap(1);
        this.wBuffer.setUint8(this.wpos,data.charCodeAt(0));
        this.wpos += 1;
    },
	
    writeString: function(data){
        var nsize1 = this.getStringByteSize(data);
        this.writeUint32(nsize1);
        this.checkWriteCap(nsize1);

        data = data.replace(/\r\n/g,"\n");
        for (var n = 0; n < data.length; n++) {
            var c = data.charCodeAt(n);
            if(c < 128){
                this.wBuffer.setUint8(this.wpos, c);
                this.wpos = this.wpos + 1;
            }else if((c > 127) && (c < 2048)){
                var c1 = (c >> 6) | 192;
                var c2 = (c & 63) | 128;
                this.wBuffer.setUint8(this.wpos, c1);
                this.wpos = this.wpos + 1;
                this.wBuffer.setUint8(this.wpos, c2);
                this.wpos = this.wpos + 1;
            }else if (c >= 0x3c000){
                var c1 = (c >> 18) | 0xF0;
                var c2 = ((c >> 12) &  0x3F)| 0x80;
                var c3 = ((c >> 6) &  0x3F)| 0x80;
                var c4 = (c & 0x3F)| 0x80;
                this.wBuffer.setUint8(this.wpos, c1);
                this.wpos = this.wpos + 1;
                this.wBuffer.setUint8(this.wpos, c2);
                this.wpos = this.wpos + 1;
                this.wBuffer.setUint8(this.wpos, c3);
                this.wpos = this.wpos + 1;
                this.wBuffer.setUint8(this.wpos, c4);
                this.wpos = this.wpos + 1;
            } else{
                var c1 = (c >> 12) | 224;
                var c2 = ((c >> 6) & 63) | 128;
                var c3 = (c & 63) | 128;
                this.wBuffer.setUint8(this.wpos, c1);
                this.wpos = this.wpos + 1;
                this.wBuffer.setUint8(this.wpos, c2);
                this.wpos = this.wpos + 1;
                this.wBuffer.setUint8(this.wpos, c3);
                this.wpos = this.wpos + 1;
            }
        }
    },
	
    writeSimpleString: function(data){
        this.checkWriteCap(data.length);
        for(var i=0; i < data.length; i++){
            this.wBuffer.setUint8(this.wpos,data.charCodeAt(i));
            this.wpos += 1;
        }
    },
	
    writeUint8 : function(data){
        this.checkWriteCap(1);
        this.wBuffer.setUint8(this.wpos,data);
        this.wpos += 1;
    },

    writeInt8: function(data){
        this.checkWriteCap(1);
        this.wBuffer.setInt8(this.wpos,data);
        this.wpos += 1;
    },
    writeUint16: function(data){
        this.checkWriteCap(2);
        this.wBuffer.setUint16(this.wpos,data);
        this.wpos += 2;
    },
	
    writeInt16: function(data){
        this.checkWriteCap(2);
        this.wBuffer.setInt16(this.wpos,data);
        this.wpos += 2;
    },
	
    writeUint32: function (data){
        this.checkWriteCap(4);
        this.wBuffer.setUint32(this.wpos,data);
        this.wpos += 4;
    },

    writeInt32: function(data){
        this.checkWriteCap(4);
        this.wBuffer.setInt32(this.wpos,data);
        this.wpos += 4;
    },

    writeInt64: function (data){
        var neg = 0;
        if(data < 0){
            neg = 1;
            data = -data;
        }
        this.writeUint8(neg);

        this.writeUint64(data);
    },

    writeUint64: function (data){
        this.checkWriteCap(8);
        //注意不要进行移位操作，js的移位会把原数值默认为有符号32位整数
        //这是一个坑，坑死人不偿命
        var high = Math.floor(data / Math.pow(2,32));
        var low = Math.floor(data%Math.pow(2,32));

        this.writeUint32(high);
        this.writeUint32(low);
    },

    //read
    pushData: function(data) {
        if(data instanceof ArrayBuffer){
            this.rBuffer = new DataView(data);
        }else{
            this.rBuffer = new DataView(new ArrayBuffer(1));
        }
    },

    isReadable: function(slen){
        if(this.rpos + slen > this.rBuffer.byteLength){
            return false;
        }

        return true;
    },

    readByteByPos: function(pos){
        return this.rBuffer.getUint8(pos);
    },

    setReadPos: function (pos) {
        if(pos < this.rBuffer.byteLength){
            this.rpos = pos;
        }
    },
    
	readString: function(){
        if(this.rpos + 4 > this.rBuffer.byteLength){
            return "";
        }

        var slen = this.readUint32();

        return this.readBytes(slen);
    },
    
	readSimpleString: function(slen){
        if(this.rpos + slen > this.rBuffer.byteLength){
            return "";
        }

        return this.readBytes(slen);
    },
    
	readBytes: function(slen){
        if(this.isReadable(slen) != true){
           return "";
        }

        var ret = "";
        for(var i = 0; i < slen; i++){
                var v = this.rBuffer.getUint8(this.rpos);
                this.rpos += 1;
                if(v < 128){
                    ret = ret + "" + String.fromCharCode(v);
                }else if((v > 191) && (v < 224)){
                    i = i+1;
                    if(i < slen){
                        var v1 = this.rBuffer.getUint8(this.rpos);
                        this.rpos += 1;
                        ret = ret + "" + String.fromCharCode((v & 31) << 6 | (v1 & 63));
                    }
                }else if(v > 239){
                    if(i + 3 < slen){
                        var v1 = this.rBuffer.getUint8(this.rpos);
                        this.rpos += 1;
                        var v2 = this.rBuffer.getUint8(this.rpos);
                        this.rpos += 1;
                        var v3 = this.rBuffer.getUint8(this.rpos);
                        this.rpos += 1;
                        ret = ret + "" + String.fromCharCode((((v & 0x0F) << 18) | ((v1 & 63) << 12) | ((v2 & 63) << 6) | (v3 & 63)));
                        i = i + 3;
                    }
                }else{
                if(i + 2 < slen){
                    var v1 = this.rBuffer.getUint8(this.rpos);
                    this.rpos += 1;
                    var v2 = this.rBuffer.getUint8(this.rpos);
                    this.rpos += 1;
                    ret = ret + "" + String.fromCharCode(((v & 15) << 12) | ((v1 & 63) << 6) | (v2 & 63));
                    i = i + 2;
                }
            }
        }
        return ret;
    },

    readUint8: function(){
        var ret = this.rBuffer.getUint8(this.rpos);
        this.rpos += 1;

        return ret;
    },

    readInt8: function(){
        var ret = this.rBuffer.getInt8(this.rpos);
        this.rpos += 1;

        return ret;
    },

    readUint16: function(){
        var ret = this.rBuffer.getUint16(this.rpos);
        this.rpos += 2;

        return ret;
    },

    readInt16: function(){
        var ret = this.rBuffer.getInt16(this.rpos);
        this.rpos += 2;

        return ret;
    },

    readUint32: function(){
        var ret = this.rBuffer.getUint32(this.rpos);
        this.rpos += 4;

        return ret;
    },

    readInt32: function(){
        var ret = this.rBuffer.getInt32(this.rpos);
        this.rpos += 4;

        return ret;
    },

    readInt64: function(){
        var neg = this.readUint8();
        var ret = this.readUint64();
        if(neg == 1){
            ret = -ret;
        }
        return ret;
    },
    
	readUint64: function(){
        var high = this.readUint32();
        var low = this.readUint32();
        return high*Math.pow(2,32)+low;
    }
}