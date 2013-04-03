/*global defineSuite*/
defineSuite([
         'Core/Event'
     ], function(
         Event) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('Event works with no scope', function() {
        var e = new Event();
        var someValue = 123;
        var callbackCalled = false;

        this.myCallback = function(expectedValue) {
            callbackCalled = true;
            expect(expectedValue).toEqual(someValue);
            expect(this).toBeUndefined();
        };

        e.addEventListener(this.myCallback);
        expect(callbackCalled).toEqual(false);

        e.raiseEvent(someValue);
        expect(callbackCalled).toEqual(true);

        callbackCalled = false;
        e.removeEventListener(this.myCallback);
        e.raiseEvent(someValue);
        expect(callbackCalled).toEqual(false);
    });

    it('Event works with scope', function() {
        var e = new Event();
        var someValue = 123;
        var callbackCalled = false;
        var that = this;
        this.myCallback = function(expectedValue) {
            callbackCalled = true;
            expect(expectedValue).toEqual(someValue);
            expect(this).toEqual(that);
        };

        e.addEventListener(this.myCallback, this);
        expect(callbackCalled).toEqual(false);

        e.raiseEvent(someValue);
        expect(callbackCalled).toEqual(true);

        callbackCalled = false;
        e.removeEventListener(this.myCallback, this);
        e.raiseEvent(someValue);
        expect(callbackCalled).toEqual(false);
    });

    it('addEventListener and removeEventListener works with same function of different scopes', function() {
        var e = new Event();

        var Scope = function() {
            this.timesCalled = 0;
        };

        Scope.prototype.myCallback = function() {
            this.timesCalled++;
        };

        var scope1 = new Scope();
        var scope2 = new Scope();

        e.addEventListener(Scope.prototype.myCallback, scope1);
        e.addEventListener(Scope.prototype.myCallback, scope2);
        e.raiseEvent();

        expect(scope1.timesCalled).toEqual(1);
        expect(scope2.timesCalled).toEqual(1);

        e.removeEventListener(Scope.prototype.myCallback, scope1);
        expect(e.getNumberOfListeners()).toEqual(1);
        e.raiseEvent();

        expect(scope1.timesCalled).toEqual(1);
        expect(scope2.timesCalled).toEqual(2);

        e.removeEventListener(Scope.prototype.myCallback, scope2);
        expect(e.getNumberOfListeners()).toEqual(0);
    });

    it('getNumberOfListeners returns the correct number', function() {
        var callback1 = function() {
        };

        var callback2 = function() {
        };

        var e = new Event();
        expect(e.getNumberOfListeners()).toEqual(0);

        e.addEventListener(callback1);
        expect(e.getNumberOfListeners()).toEqual(1);

        e.addEventListener(callback2);
        expect(e.getNumberOfListeners()).toEqual(2);

        e.removeEventListener(callback2);
        expect(e.getNumberOfListeners()).toEqual(1);
    });

    it('Event works with no listeners', function() {
        var e = new Event();
        e.raiseEvent(123);
    });

    it('addEventListener throws with undefined listener', function() {
        var e = new Event();
        expect(function() {
            e.addEventListener(undefined);
        }).toThrow();
    });

    it('addEventListener throws with null listener', function() {
        var e = new Event();
        expect(function() {
            e.addEventListener(null);
        }).toThrow();
    });

    it('addEventListener throws with non-function listener', function() {
        var e = new Event();
        expect(function() {
            e.addEventListener({});
        }).toThrow();
    });

    it('removeEventListener throws with undefined listener', function() {
        var e = new Event();
        expect(function() {
            e.removeEventListener(undefined);
        }).toThrow();
    });

    it('removeEventListener throws with null listener', function() {
        var e = new Event();
        expect(function() {
            e.removeEventListener(null);
        }).toThrow();
    });

    it('removeEventListener throws with non registered listener', function() {
        var e = new Event();
        expect(function() {
            e.removeEventListener(function() {
            });
        }).toThrow();
    });

    it('removeEventListener throws with registered listener of a different scope', function() {
        var e = new Event();

        var myFunc = function() {
        };
        e.addEventListener(myFunc, e);

        expect(function() {
            e.removeEventListener(myFunc);
        }).toThrow();
    });
});