/*global defineSuite*/
defineSuite([
         'Core/PolygonPipeline',
         'Core/Cartesian2',
         'Core/Cartesian3',
         'Core/Cartographic',
         'Core/Ellipsoid',
         'Core/WindingOrder',
         'Core/Math'
     ], function(
         PolygonPipeline,
         Cartesian2,
         Cartesian3,
         Cartographic,
         Ellipsoid,
         WindingOrder,
         CesiumMath) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('cleanUp removes duplicate points', function() {
        var positions = PolygonPipeline.cleanUp([
                                                 new Cartesian3(1.0, 1.0, 1.0),
                                                 new Cartesian3(2.0, 2.0, 2.0),
                                                 new Cartesian3(2.0, 2.0, 2.0),
                                                 new Cartesian3(3.0, 3.0, 3.0)
                                                ]);

        expect(positions).toEqual([
                                        new Cartesian3(1.0, 1.0, 1.0),
                                        new Cartesian3(2.0, 2.0, 2.0),
                                        new Cartesian3(3.0, 3.0, 3.0)
                                       ]);
    });

    it('cleanUp removes duplicate first and last points', function() {
        var positions = PolygonPipeline.cleanUp([
                                                 new Cartesian3(1.0, 1.0, 1.0),
                                                 new Cartesian3(2.0, 2.0, 2.0),
                                                 new Cartesian3(3.0, 3.0, 3.0),
                                                 new Cartesian3(1.0, 1.0, 1.0)
                                                ]);

        expect(positions).toEqual([
                                        new Cartesian3(2.0, 2.0, 2.0),
                                        new Cartesian3(3.0, 3.0, 3.0),
                                        new Cartesian3(1.0, 1.0, 1.0)
                                       ]);
    });

    it('cleanUp throws without positions', function() {
        expect(function() {
            PolygonPipeline.cleanUp();
        }).toThrow();
    });

    it('cleanUp throws without three positions', function() {
        expect(function() {
            PolygonPipeline.cleanUp([Cartesian3.ZERO, Cartesian3.ZERO]);
        }).toThrow();
    });

    it('computeArea2D computes a positive area', function() {
        var area = PolygonPipeline.computeArea2D([
                                                  new Cartesian2(0.0, 0.0),
                                                  new Cartesian2(2.0, 0.0),
                                                  new Cartesian2(2.0, 1.0),
                                                  new Cartesian2(0.0, 1.0)
                                                 ]);

        expect(area).toEqual(2.0);
    });

    it('computeArea2D computes a negative area', function() {
        var area = PolygonPipeline.computeArea2D([
                                                  new Cartesian2(0.0, 0.0),
                                                  new Cartesian2(0.0, 2.0),
                                                  new Cartesian2(1.0, 2.0),
                                                  new Cartesian2(1.0, 0.0)
                                                 ]);

        expect(area).toEqual(-2.0);
    });

    it('computeArea2D throws without positions', function() {
        expect(function() {
            PolygonPipeline.computeArea2D();
        }).toThrow();
    });

    it('computeArea2D throws without three positions', function() {
        expect(function() {
            PolygonPipeline.computeArea2D([Cartesian3.ZERO, Cartesian3.ZERO]);
        }).toThrow();
    });

    ///////////////////////////////////////////////////////////////////////

    it('computeWindingOrder2D computes counter-clockwise', function() {
        var area = PolygonPipeline.computeWindingOrder2D([
                                                          new Cartesian2(0.0, 0.0),
                                                          new Cartesian2(2.0, 0.0),
                                                          new Cartesian2(2.0, 1.0),
                                                          new Cartesian2(0.0, 1.0)
                                                         ]);

        expect(area).toEqual(WindingOrder.COUNTER_CLOCKWISE);
    });

    it('computeWindingOrder2D computes clockwise', function() {
        var area = PolygonPipeline.computeWindingOrder2D([
                                                          new Cartesian2(0.0, 0.0),
                                                          new Cartesian2(0.0, 2.0),
                                                          new Cartesian2(1.0, 2.0),
                                                          new Cartesian2(1.0, 0.0)
                                                         ]);

        expect(area).toEqual(WindingOrder.CLOCKWISE);
    });

    it('computeWindingOrder2D throws without positions', function() {
        expect(function() {
            PolygonPipeline.computeWindingOrder2D();
        }).toThrow();
    });

    it('computeWindingOrder2D throws without three positions', function() {
        expect(function() {
            PolygonPipeline.computeWindingOrder2D([Cartesian3.ZERO, Cartesian3.ZERO]);
        }).toThrow();
    });

    ///////////////////////////////////////////////////////////////////////

    it('earClip2D triangulates a triangle', function() {
        var indices = PolygonPipeline.earClip2D([new Cartesian2(0.0, 0.0), new Cartesian2(1.0, 0.0), new Cartesian2(0.0, 1.0)]);

        expect(indices).toEqual([0, 1, 2]);
    });

    it('earClip2D triangulates a square', function() {
        var indices = PolygonPipeline.earClip2D([new Cartesian2(0.0, 0.0), new Cartesian2(1.0, 0.0), new Cartesian2(1.0, 1.0), new Cartesian2(0.0, 1.0)]);

        expect(indices).toEqual([0, 1, 2, 0, 2, 3]);
    });

    it('earClip2D triangulates simple concave', function() {
        var positions = [new Cartesian2(0.0, 0.0), new Cartesian2(2.0, 0.0), new Cartesian2(2.0, 2.0), new Cartesian2(1.0, 0.25), new Cartesian2(0.0, 2.0)];

        var indices = PolygonPipeline.earClip2D(positions);

        expect(indices).toEqual([1, 2, 3, 3, 4, 0, 0, 1, 3]);
    });

    it('earClip2D triangulates complex concave', function() {
        var positions = [new Cartesian2(0.0, 0.0), new Cartesian2(2.0, 0.0), new Cartesian2(2.0, 1.0), new Cartesian2(0.1, 1.5), new Cartesian2(2.0, 2.0), new Cartesian2(0.0, 2.0),
                new Cartesian2(0.0, 1.0), new Cartesian2(1.9, 0.5)];

        var indices = PolygonPipeline.earClip2D(positions);

        expect(indices).toEqual([3, 4, 5, 3, 5, 6, 3, 6, 7, 7, 0, 1, 7, 1, 2, 2, 3, 7]);
    });

    it('earClip2D throws without positions', function() {
        expect(function() {
            PolygonPipeline.earClip2D();
        }).toThrow();
    });

    it('earClip2D throws without three positions', function() {
        expect(function() {
            PolygonPipeline.earClip2D([Cartesian2.ZERO, Cartesian2.ZERO]);
        }).toThrow();
    });

    ///////////////////////////////////////////////////////////////////////

    it('wrapLongitude subdivides triangle it crosses the international date line, p0 behind', function() {
        var positions = [new Cartesian3(-1.0, -1.0, 0.0), new Cartesian3(-1.0, 1.0, 2.0), new Cartesian3(-1.0, 2.0, 2.0)];
        var indices = [0, 1, 2];
        indices = PolygonPipeline.wrapLongitude(positions, indices);
        expect(indices).toEqual([0, 3, 4, 1, 2, 6, 1, 6, 5]);
        expect(positions[0].equals(new Cartesian3(-1.0, -1.0, 0.0))).toEqual(true);
        expect(positions[1].equals(new Cartesian3(-1.0, 1.0, 2.0))).toEqual(true);
        expect(positions[2].equals(new Cartesian3(-1.0, 2.0, 2.0))).toEqual(true);
        expect(positions.length).toEqual(7);
    });

    it('wrapLongitude subdivides triangle it crosses the international date line, p1 behind', function() {
        var positions = [new Cartesian3(-1.0, 1.0, 2.0), new Cartesian3(-1.0, -1.0, 0.0), new Cartesian3(-1.0, 2.0, 2.0)];
        var indices = [0, 1, 2];
        indices = PolygonPipeline.wrapLongitude(positions, indices);
        expect(indices).toEqual([1, 3, 4, 2, 0, 6, 2, 6, 5]);
        expect(positions[0].equals(new Cartesian3(-1.0, 1.0, 2.0))).toEqual(true);
        expect(positions[1].equals(new Cartesian3(-1.0, -1.0, 0.0))).toEqual(true);
        expect(positions[2].equals(new Cartesian3(-1.0, 2.0, 2.0))).toEqual(true);
        expect(positions.length).toEqual(7);
    });

    it('wrapLongitude subdivides triangle it crosses the international date line, p2 behind', function() {
        var positions = [new Cartesian3(-1.0, 1.0, 2.0), new Cartesian3(-1.0, 2.0, 2.0), new Cartesian3(-1.0, -1.0, 0.0)];
        var indices = [0, 1, 2];
        indices = PolygonPipeline.wrapLongitude(positions, indices);
        expect(indices).toEqual([2, 3, 4, 0, 1, 6, 0, 6, 5]);
        expect(positions[0].equals(new Cartesian3(-1.0, 1.0, 2.0))).toEqual(true);
        expect(positions[1].equals(new Cartesian3(-1.0, 2.0, 2.0))).toEqual(true);
        expect(positions[2].equals(new Cartesian3(-1.0, -1.0, 0.0))).toEqual(true);
        expect(positions.length).toEqual(7);
    });

    it('wrapLongitude subdivides triangle it crosses the international date line, p0 ahead', function() {
        var positions = [new Cartesian3(-1.0, 2.0, 0.0), new Cartesian3(-1.0, -1.0, 0.0), new Cartesian3(-1.0, -1.0, 0.0)];
        var indices = [0, 1, 2];
        indices = PolygonPipeline.wrapLongitude(positions, indices);
        expect(indices).toEqual([1, 2, 4, 1, 4, 3, 0, 5, 6]);
        expect(positions[0].equals(new Cartesian3(-1.0, 2.0, 0.0))).toEqual(true);
        expect(positions[1].equals(new Cartesian3(-1.0, -1.0, 0.0))).toEqual(true);
        expect(positions[2].equals(new Cartesian3(-1.0, -1.0, 0.0))).toEqual(true);
        expect(positions.length).toEqual(7);
    });

    it('wrapLongitude subdivides triangle it crosses the international date line, p1 ahead', function() {
        var positions = [new Cartesian3(-1.0, -1.0, 0.0), new Cartesian3(-1.0, 2.0, 0.0), new Cartesian3(-1.0, -1.0, 0.0)];
        var indices = [0, 1, 2];
        indices = PolygonPipeline.wrapLongitude(positions, indices);
        expect(indices).toEqual([2, 0, 4, 2, 4, 3, 1, 5, 6]);
        expect(positions[0].equals(new Cartesian3(-1.0, -1.0, 0.0))).toEqual(true);
        expect(positions[1].equals(new Cartesian3(-1.0, 2.0, 0.0))).toEqual(true);
        expect(positions[2].equals(new Cartesian3(-1.0, -1.0, 0.0))).toEqual(true);
        expect(positions.length).toEqual(7);
    });

    it('wrapLongitude subdivides triangle it crosses the international date line, p2 ahead', function() {
        var positions = [new Cartesian3(-1.0, -1.0, 0.0), new Cartesian3(-1.0, -1.0, 0.0), new Cartesian3(-1.0, 2.0, 0.0)];
        var indices = [0, 1, 2];
        indices = PolygonPipeline.wrapLongitude(positions, indices);
        expect(indices).toEqual([0, 1, 4, 0, 4, 3, 2, 5, 6]);
        expect(positions[0].equals(new Cartesian3(-1.0, -1.0, 0.0))).toEqual(true);
        expect(positions[1].equals(new Cartesian3(-1.0, -1.0, 0.0))).toEqual(true);
        expect(positions[2].equals(new Cartesian3(-1.0, 2.0, 0.0))).toEqual(true);
        expect(positions.length).toEqual(7);
    });

    it('wrapLongitude returns offsets triangle that touches the international date line', function() {
        var positions = [new Cartesian3(-1, 0, 1), new Cartesian3(-1, CesiumMath.EPSILON14, 2), new Cartesian3(-2, 2, 2)];
        var indices = [0, 1, 2];
        indices = PolygonPipeline.wrapLongitude(positions, indices);
        expect(indices).toEqual([0, 1, 2]);
        expect(positions[0].equals(new Cartesian3(-1, CesiumMath.EPSILON11, 1))).toEqual(true);
        expect(positions[1].equals(new Cartesian3(-1, CesiumMath.EPSILON11, 2))).toEqual(true);
        expect(positions[2].equals(new Cartesian3(-2, 2, 2))).toEqual(true);
        expect(positions.length).toEqual(3);
    });

    it('wrapLongitude returns the same points if the triangle doesn\'t cross the international date line, behind', function() {
        var positions = [new Cartesian3(-1, -1, 1), new Cartesian3(-1, -2, 1), new Cartesian3(-1, -2, 2)];
        var indices = [0, 1, 2];
        indices = PolygonPipeline.wrapLongitude(positions, indices);
        expect(indices).toEqual([0, 1, 2]);
        expect(positions[0].equals(new Cartesian3(-1, -1, 1))).toEqual(true);
        expect(positions[1].equals(new Cartesian3(-1, -2, 1))).toEqual(true);
        expect(positions[2].equals(new Cartesian3(-1, -2, 2))).toEqual(true);
        expect(positions.length).toEqual(3);
    });

    it('wrapLongitude returns the same points if the triangle doesn\'t cross the international date line, ahead', function() {
        var positions = [new Cartesian3(-1, 1, 1), new Cartesian3(-1, 2, 1), new Cartesian3(-1, 2, 2)];
        var indices = [0, 1, 2];
        indices = PolygonPipeline.wrapLongitude(positions, indices);
        expect(indices).toEqual([0, 1, 2]);
        expect(positions[0].equals(new Cartesian3(-1, 1, 1))).toEqual(true);
        expect(positions[1].equals(new Cartesian3(-1, 2, 1))).toEqual(true);
        expect(positions[2].equals(new Cartesian3(-1, 2, 2))).toEqual(true);
        expect(positions.length).toEqual(3);
    });

    it('wrapLongitude returns the same points if the triangle doesn\'t cross the international date line, positive x', function() {
        var positions = [new Cartesian3(1, 1, 1), new Cartesian3(1, 2, 1), new Cartesian3(1, 2, 2)];
        var indices = [0, 1, 2];
        indices = PolygonPipeline.wrapLongitude(positions, indices);
        expect(indices).toEqual([0, 1, 2]);
        expect(positions[0].equals(new Cartesian3(1, 1, 1))).toEqual(true);
        expect(positions[1].equals(new Cartesian3(1, 2, 1))).toEqual(true);
        expect(positions[2].equals(new Cartesian3(1, 2, 2))).toEqual(true);
        expect(positions.length).toEqual(3);
    });

    it('wrapLongitude throws with count indices not multiple of three', function() {
        expect(function() {
            PolygonPipeline.wrapLongitude([Cartesian3.ZERO, Cartesian3.ZERO], [0, 0, 0, 0]);
        }).toThrow();
    });

    it('wrapLongitude throws with < 3 indices', function() {
        expect(function() {
            PolygonPipeline.wrapLongitude([Cartesian3.ZERO, Cartesian3.ZERO], []);
        }).toThrow();
    });

    it('wrapLongitude throws without positions', function() {
        expect(function() {
            PolygonPipeline.wrapLongitude();
        }).toThrow();
    });

    it('wrapLongitude throws without indices', function() {
        expect(function() {
            PolygonPipeline.wrapLongitude([Cartesian3.ZERO, Cartesian3.ZERO]);
        }).toThrow();
    });

    ///////////////////////////////////////////////////////////////////////

    it('computeSubdivision throws without positions', function() {
        expect(function() {
            PolygonPipeline.computeSubdivision();
        }).toThrow();
    });

    it('computeSubdivision throws without indices', function() {
        expect(function() {
            PolygonPipeline.computeSubdivision([]);
        }).toThrow();
    });

    it('computeSubdivision throws with less than 3 indices', function() {
        expect(function() {
            PolygonPipeline.computeSubdivision([], [1, 2]);
        }).toThrow();
    });

    it('computeSubdivision throws without a multiple of 3 indices', function() {
        expect(function() {
            PolygonPipeline.computeSubdivision([], [1, 2, 3, 4]);
        }).toThrow();
    });

    it('computeSubdivision throws with negative granularity', function() {
        expect(function() {
            PolygonPipeline.computeSubdivision([], [1, 2, 3], -1.0);
        }).toThrow();
    });

    it('computeSubdivision', function() {
        var positions = [
                         new Cartesian3(0.0, 0.0, 90.0),
                         new Cartesian3(0.0, 90.0, 0.0),
                         new Cartesian3(90.0, 0.0, 0.0)
                        ];
        var indices = [0, 1, 2];
        var subdivision = PolygonPipeline.computeSubdivision(positions, indices, 60.0);

        expect(subdivision.attributes.position.values[0]).toEqual(0.0);
        expect(subdivision.attributes.position.values[1]).toEqual(0.0);
        expect(subdivision.attributes.position.values[2]).toEqual(90.0);
        expect(subdivision.attributes.position.values[3]).toEqual(0.0);
        expect(subdivision.attributes.position.values[4]).toEqual(90.0);
        expect(subdivision.attributes.position.values[5]).toEqual(0.0);
        expect(subdivision.attributes.position.values[6]).toEqual(90.0);
        expect(subdivision.attributes.position.values[7]).toEqual(0.0);
        expect(subdivision.attributes.position.values[8]).toEqual(0.0);

        expect(subdivision.indexLists[0].values[0]).toEqual(0);
        expect(subdivision.indexLists[0].values[1]).toEqual(1);
        expect(subdivision.indexLists[0].values[2]).toEqual(2);
    });

    it('eliminateHoles throws an exception without an outerRing', function() {
        expect(function() {
            PolygonPipeline.eliminateHoles();
        }).toThrow();
    });

    it('eliminateHoles throws an exception with an empty outerRing', function() {
        expect(function() {
            PolygonPipeline.eliminateHoles([]);
        }).toThrow();
    });

    it('eliminateHoles throws an exception without a second argument', function() {
        expect(function() {
            PolygonPipeline.eliminateHoles([new Cartesian3()]);
        }).toThrow();
    });

    it('eliminateHoles works with non-WGS84 ellipsoids', function() {
        var outerRing = Ellipsoid.UNIT_SPHERE.cartographicArrayToCartesianArray([
            new Cartographic.fromDegrees(-122.0, 37.0, 0.0),
            new Cartographic.fromDegrees(-121.9, 37.0, 0.0),
            new Cartographic.fromDegrees(-121.9, 37.1, 0.0),
            new Cartographic.fromDegrees(-122.0, 37.1, 0.0),
            new Cartographic.fromDegrees(-122.0, 37.0, 0.0)
        ]);

        var innerRing = Ellipsoid.UNIT_SPHERE.cartographicArrayToCartesianArray([
            new Cartographic.fromDegrees(-121.96, 37.04, 0.0),
            new Cartographic.fromDegrees(-121.96, 37.01, 0.0),
            new Cartographic.fromDegrees(-121.99, 37.01, 0.0),
            new Cartographic.fromDegrees(-121.99, 37.04, 0.0)
        ]);

        var innerRings = [innerRing];
        var positions = PolygonPipeline.eliminateHoles(outerRing, innerRings, Ellipsoid.UNIT_SPHERE);

        expect(positions[0]).toEqual(outerRing[0]);
        expect(positions[1]).toEqual(outerRing[1]);

        expect(positions[2]).toEqual(innerRing[0]);
        expect(positions[3]).toEqual(innerRing[1]);
        expect(positions[4]).toEqual(innerRing[2]);
        expect(positions[5]).toEqual(innerRing[3]);
        expect(positions[6]).toEqual(innerRing[0]);

        expect(positions[7]).toEqual(outerRing[1]);
        expect(positions[8]).toEqual(outerRing[2]);
        expect(positions[9]).toEqual(outerRing[3]);
        expect(positions[10]).toEqual(outerRing[0]);
    });

    it('eliminateHoles removes a hole from a polygon', function() {
        var outerRing = Ellipsoid.WGS84.cartographicArrayToCartesianArray([
            new Cartographic.fromDegrees(-122.0, 37.0, 0.0),
            new Cartographic.fromDegrees(-121.9, 37.0, 0.0),
            new Cartographic.fromDegrees(-121.9, 37.1, 0.0),
            new Cartographic.fromDegrees(-122.0, 37.1, 0.0),
            new Cartographic.fromDegrees(-122.0, 37.0, 0.0)
        ]);

        var innerRing = Ellipsoid.WGS84.cartographicArrayToCartesianArray([
            new Cartographic.fromDegrees(-121.96, 37.04, 0.0),
            new Cartographic.fromDegrees(-121.96, 37.01, 0.0),
            new Cartographic.fromDegrees(-121.99, 37.01, 0.0),
            new Cartographic.fromDegrees(-121.99, 37.04, 0.0)
        ]);

        var innerRings = [innerRing];
        var positions = PolygonPipeline.eliminateHoles(outerRing, innerRings);

        expect(positions[0]).toEqual(outerRing[0]);
        expect(positions[1]).toEqual(outerRing[1]);

        expect(positions[2]).toEqual(innerRing[0]);
        expect(positions[3]).toEqual(innerRing[1]);
        expect(positions[4]).toEqual(innerRing[2]);
        expect(positions[5]).toEqual(innerRing[3]);
        expect(positions[6]).toEqual(innerRing[0]);

        expect(positions[7]).toEqual(outerRing[1]);
        expect(positions[8]).toEqual(outerRing[2]);
        expect(positions[9]).toEqual(outerRing[3]);
        expect(positions[10]).toEqual(outerRing[0]);
    });

    it('eliminateHoles ensures proper winding order', function() {
        var outerRing = Ellipsoid.WGS84.cartographicArrayToCartesianArray([
            new Cartographic.fromDegrees(-122.0, 37.0, 0.0),
            new Cartographic.fromDegrees(-121.9, 37.0, 0.0),
            new Cartographic.fromDegrees(-121.9, 37.1, 0.0),
            new Cartographic.fromDegrees(-122.0, 37.1, 0.0),
            new Cartographic.fromDegrees(-122.0, 37.0, 0.0)
        ]);

        var innerRing = Ellipsoid.WGS84.cartographicArrayToCartesianArray([
            new Cartographic.fromDegrees(-121.96, 37.04, 0.0),
            new Cartographic.fromDegrees(-121.99, 37.04, 0.0),
            new Cartographic.fromDegrees(-121.99, 37.01, 0.0),
            new Cartographic.fromDegrees(-121.96, 37.01, 0.0)
        ]);

        var innerRings = [innerRing];
        var positions = PolygonPipeline.eliminateHoles(outerRing, innerRings);

        expect(positions[0]).toEqual(outerRing[0]);
        expect(positions[1]).toEqual(outerRing[1]);

        expect(positions[2]).toEqual(innerRing[0]);
        expect(positions[3]).toEqual(innerRing[3]);
        expect(positions[4]).toEqual(innerRing[2]);
        expect(positions[5]).toEqual(innerRing[1]);
        expect(positions[6]).toEqual(innerRing[0]);

        expect(positions[7]).toEqual(outerRing[1]);
        expect(positions[8]).toEqual(outerRing[2]);
        expect(positions[9]).toEqual(outerRing[3]);
        expect(positions[10]).toEqual(outerRing[0]);
    });

    it('eliminateHoles works with concave polygons', function() {
        var outerRing = Ellipsoid.WGS84.cartographicArrayToCartesianArray([
            new Cartographic.fromDegrees(-122.0, 37.0),
            new Cartographic.fromDegrees(-121.96, 37.0),
            new Cartographic.fromDegrees(-121.92, 37.03),
            new Cartographic.fromDegrees(-121.92, 37.0),
            new Cartographic.fromDegrees(-121.9, 37.0),
            new Cartographic.fromDegrees(-121.9, 37.1),
            new Cartographic.fromDegrees(-122.0, 37.1)
        ]);

        var innerRing = Ellipsoid.WGS84.cartographicArrayToCartesianArray([
            new Cartographic.fromDegrees(-121.99, 37.01),
            new Cartographic.fromDegrees(-121.99, 37.04),
            new Cartographic.fromDegrees(-121.96, 37.04),
            new Cartographic.fromDegrees(-121.96, 37.01)
        ]);

        var positions = PolygonPipeline.eliminateHoles(outerRing, [innerRing]);

        expect(positions[0]).toEqual(outerRing[0]);
        expect(positions[1]).toEqual(outerRing[1]);
        expect(positions[2]).toEqual(outerRing[2]);

        expect(positions[3]).toEqual(innerRing[2]);
        expect(positions[4]).toEqual(innerRing[3]);
        expect(positions[5]).toEqual(innerRing[0]);
        expect(positions[6]).toEqual(innerRing[1]);
        expect(positions[7]).toEqual(innerRing[2]);

        expect(positions[8]).toEqual(outerRing[2]);
        expect(positions[9]).toEqual(outerRing[3]);
        expect(positions[10]).toEqual(outerRing[4]);
        expect(positions[11]).toEqual(outerRing[5]);
        expect(positions[12]).toEqual(outerRing[6]);
    });

    it('eliminateHoles eliminates multiple holes', function() {
        var outerRing = Ellipsoid.WGS84.cartographicArrayToCartesianArray([
            new Cartographic.fromDegrees(-122.0, 37.0),
            new Cartographic.fromDegrees(-121.9, 37.0),
            new Cartographic.fromDegrees(-121.9, 37.1),
            new Cartographic.fromDegrees(-122.0, 37.1)
        ]);

        var inner0 = Ellipsoid.WGS84.cartographicArrayToCartesianArray([
            new Cartographic.fromDegrees(-121.99, 37.01),
            new Cartographic.fromDegrees(-121.99, 37.04),
            new Cartographic.fromDegrees(-121.96, 37.04),
            new Cartographic.fromDegrees(-121.96, 37.01)
        ]);
        var inner1 = Ellipsoid.WGS84.cartographicArrayToCartesianArray([
            new Cartographic.fromDegrees(-121.94, 37.06),
            new Cartographic.fromDegrees(-121.94, 37.09),
            new Cartographic.fromDegrees(-121.91, 37.09),
            new Cartographic.fromDegrees(-121.91, 37.06)
        ]);
        var inner2 = Ellipsoid.WGS84.cartographicArrayToCartesianArray([
            new Cartographic.fromDegrees(-121.99, 37.06),
            new Cartographic.fromDegrees(-121.99, 37.09),
            new Cartographic.fromDegrees(-121.96, 37.09),
            new Cartographic.fromDegrees(-121.96, 37.06)
        ]);
        var inner3 = Ellipsoid.WGS84.cartographicArrayToCartesianArray([
            new Cartographic.fromDegrees(-121.94, 37.01),
            new Cartographic.fromDegrees(-121.94, 37.04),
            new Cartographic.fromDegrees(-121.91, 37.04),
            new Cartographic.fromDegrees(-121.91, 37.01)
        ]);

        var innerRings = [inner0, inner1, inner2, inner3];
        var positions = PolygonPipeline.eliminateHoles(outerRing, innerRings);
        expect(outerRing.length).toEqual(4);
        expect(innerRings.length).toEqual(4);
        expect(positions.length).toEqual(28);
    });
});