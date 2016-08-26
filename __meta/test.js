"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var stunts_1 = require('stunts');
var lang_1 = require('@angular/facade/src/lang');
var collection_1 = require('@angular/facade/src/collection');
var core_1 = require('@angular/core');
var Inline_isPresent_Object = (function (_super) {
    __extends(Inline_isPresent_Object, _super);
    function Inline_isPresent_Object() {
        _super.apply(this, arguments);
        this.substitute = [this.substitute$1, this.substitute$2];
    }
    Inline_isPresent_Object.prototype.match = function (i) { lang_1.isPresent(i); };
    Inline_isPresent_Object.prototype.substitute$1 = function (i) { i; };
    Inline_isPresent_Object.prototype.substitute$2 = function (i) { !!i; };
    __decorate([
        stunts_1.Match.Expression(),
        __param(0, stunts_1.Match.Complex())
    ], Inline_isPresent_Object.prototype, "match");
    __decorate([
        Template()
    ], Inline_isPresent_Object.prototype, "substitute$1");
    __decorate([
        Template()
    ], Inline_isPresent_Object.prototype, "substitute$2");
    return Inline_isPresent_Object;
}(SimpleTransform));
var Inline_isPresent_any = (function (_super) {
    __extends(Inline_isPresent_any, _super);
    function Inline_isPresent_any() {
        _super.apply(this, arguments);
    }
    Inline_isPresent_any.prototype.match = function (i) { lang_1.isPresent(i); };
    Inline_isPresent_any.prototype.substitute = function (i) { i !== null && i !== undefined; };
    __decorate([
        stunts_1.Match.Expression()
    ], Inline_isPresent_any.prototype, "match");
    return Inline_isPresent_any;
}(SimpleTransform));
var Inline_isPresent_complex_if = (function (_super) {
    __extends(Inline_isPresent_complex_if, _super);
    function Inline_isPresent_complex_if() {
        _super.apply(this, arguments);
    }
    Inline_isPresent_complex_if.prototype.match = function (i) {
        if ((lang_1.isPresent(i))) {
            stunts_1.Matchers.Statements();
        }
    };
    Inline_isPresent_complex_if.prototype.substitute = function (i) {
        var val = i;
        if (val !== null && val !== undefined) {
            stunts_1.Matchers.Statements();
        }
    };
    __decorate([
        __param(0, stunts_1.Match.Complex())
    ], Inline_isPresent_complex_if.prototype, "match");
    return Inline_isPresent_complex_if;
}(SimpleTransform));
exports.Inline_isPresent = transformGroup('Inline isPresent()', [
    Inline_isPresent_object,
    Inline_isPresent_any,
    Inline_isPresent_complex_if,
]);
var Inline_provide_ = (function () {
    function Inline_provide_() {
    }
    Inline_provide_.prototype.before = function (token, provider) {
        core_1.provide(token, provider);
    };
    Inline_provide_.prototype.after = function (token) {
        Object.assign({ provide: sth }, provider);
    };
    __decorate([
        stunts_1.Match.Expression()
    ], Inline_provide_.prototype, "before");
    return Inline_provide_;
}());
exports.Inline_provide_ = Inline_provide_;
exports.Inline_provide = transformGroup('Inline provide()', [
    Inline_provide_,
    Fixups.simplifyObjectAssign,
]);
var Inline_provide_v2_ = (function () {
    function Inline_provide_v2_() {
    }
    Inline_provide_v2_.prototype.matcher = function (token, provider) {
        core_1.provide(token, provider);
    };
    Inline_provide_v2_.prototype.template = function (token, provider) {
        Object.assign({ provide: sth }, provider);
    };
    Inline_provide_v2_.prototype.process = function () {
        var _this = this;
        return defineTransform(function (sf) {
            return mapMatched(sf, _this.matcher, function (matched) {
                var node = template.expand(matched);
                node = Fixups.simplifyObjectAssign(node);
                return node;
            });
        });
    };
    __decorate([
        Matcher(),
        stunts_1.Match.Expression()
    ], Inline_provide_v2_.prototype, "matcher");
    __decorate([
        Template()
    ], Inline_provide_v2_.prototype, "template");
    Inline_provide_v2_ = __decorate([
        Transform()
    ], Inline_provide_v2_);
    return Inline_provide_v2_;
}());
exports.Inline_provide_v2 = transformGroup('Inline provide() v2', [
    Inline_provide_v2_
]);
transformGroup('Copy arrayFromMap()', [
    (function () {
        var matcher = createMatcher((function () {
            function class_1() {
            }
            class_1.prototype.match = function (i) {
                collection_1.arrayFromMap(i);
            };
            return class_1;
        }()));
        return defineTransform(function (sf) {
            return stunts_1.Utils.mapMatched(sf, matcher, function (matched) {
                attachMetadata(matched.root, stunts_1.Helper.REQUIRE_HELPER, { symbol: stunts_1.symbol(collection_1.arrayFromMap) });
                return matched.root;
            });
        });
    })(),
    stunts_1.Helper.emitHelper,
]);
transformGroup('Remove imports', [Fixups.removeImports]);
