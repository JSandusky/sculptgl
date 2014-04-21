define([
  'editor/Subdivision'
], function (Subdivision) {

  'use strict';

  var Multiresolution = {};

  /** Go to one level above (down to up) */
  Multiresolution.higherSynthesis = function (meshDown, meshUp) {
    Subdivision.partialSubdivision(meshDown, meshUp.verticesXYZ_, meshUp.colorsRGB_);
    Multiresolution.applyDetails(meshUp);
  };

  /** Go to one level below (up to down) */
  Multiresolution.lowerAnalysis = function (meshUp, meshDown) {
    meshDown.verticesXYZ_.set(meshUp.verticesXYZ_.subarray(0, meshDown.getNbVertices() * 3));
    meshDown.colorsRGB_.set(meshUp.colorsRGB_.subarray(0, meshDown.getNbVertices() * 3));
    var subdVerts = new Float32Array(meshUp.getNbVertices() * 3);
    var subdColors = new Float32Array(meshUp.getNbVertices() * 3);
    Subdivision.partialSubdivision(meshDown, subdVerts, subdColors);
    Multiresolution.computeDetails(meshUp, subdVerts, subdColors);
  };

  /** Apply back the detail vectors */
  Multiresolution.applyDetails = function (meshUp) {
    var vrrStartCountUp = meshUp.vrrStartCount_;
    var vertRingVertUp = meshUp.vertRingVert_;
    var vArUp = meshUp.verticesXYZ_;
    var nArUp = meshUp.normalsXYZ_;
    var cArUp = meshUp.colorsRGB_;
    var nbVertsUp = meshUp.getNbVertices();

    var vArOut = new Float32Array(vArUp.length);
    var dAr = meshUp.detailsXYZ_;
    var dColorAr = meshUp.detailsRGB_;

    for (var i = 0; i < nbVertsUp; ++i) {
      var j = i * 3;

      // vertex coord
      var vx = vArUp[j];
      var vy = vArUp[j + 1];
      var vz = vArUp[j + 2];

      // normal vec
      var nx = nArUp[j];
      var ny = nArUp[j + 1];
      var nz = nArUp[j + 2];
      // normalize vector
      var len = 1.0 / Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx *= len;
      ny *= len;
      nz *= len;

      // tangent vec (vertex neighbor - vertex)
      var k = vertRingVertUp[vrrStartCountUp[i * 2]] * 3;
      var tx = vArUp[k] - vx;
      var ty = vArUp[k + 1] - vy;
      var tz = vArUp[k + 2] - vz;
      // distance to normal plane
      len = tx * nx + ty * ny + tz * nz;
      // project on normal plane
      tx -= nx * len;
      ty -= ny * len;
      tz -= nz * len;
      // normalize vector
      len = 1.0 / Math.sqrt(tx * tx + ty * ty + tz * tz);
      tx *= len;
      ty *= len;
      tz *= len;

      // bi normal/tangent
      var bix = ny * tz - nz * ty;
      var biy = nz * tx - nx * tz;
      var biz = nx * ty - ny * tx;

      // displacement/detail vector (object space)
      var dx = dAr[j];
      var dy = dAr[j + 1];
      var dz = dAr[j + 2];

      // detail vec in the local frame
      vArOut[j] = vx + nx * dx + tx * dy + bix * dz;
      vArOut[j + 1] = vy + ny * dx + ty * dy + biy * dz;
      vArOut[j + 2] = vz + nz * dx + tz * dy + biz * dz;

      cArUp[j] += dColorAr[j];
      cArUp[j + 1] += dColorAr[j + 1];
      cArUp[j + 2] += dColorAr[j + 2];
    }
    meshUp.verticesXYZ_ = vArOut;
  };

  /** Compute the detail vectors */
  Multiresolution.computeDetails = function (meshUp, downSubd, subdColors) {
    var vrrStartCountUp = meshUp.vrrStartCount_;
    var vertRingVertUp = meshUp.vertRingVert_;
    var vArUp = meshUp.verticesXYZ_;
    var nArUp = meshUp.normalsXYZ_;
    var cArUp = meshUp.colorsRGB_;
    var nbVertices = meshUp.getNbVertices();

    var dAr = meshUp.detailsXYZ_ = new Float32Array(downSubd.length);
    var dColorAr = meshUp.detailsRGB_ = new Float32Array(downSubd.length);

    for (var i = 0; i < nbVertices; ++i) {
      var j = i * 3;

      // normal vec
      var nx = nArUp[j];
      var ny = nArUp[j + 1];
      var nz = nArUp[j + 2];
      // normalize vector
      var len = 1.0 / Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx *= len;
      ny *= len;
      nz *= len;

      // tangent vec (vertex neighbor - vertex)
      var k = vertRingVertUp[vrrStartCountUp[i * 2]] * 3;
      var tx = downSubd[k] - downSubd[j];
      var ty = downSubd[k + 1] - downSubd[j + 1];
      var tz = downSubd[k + 2] - downSubd[j + 2];
      // distance to normal plane
      len = tx * nx + ty * ny + tz * nz;
      // project on normal plane
      tx -= nx * len;
      ty -= ny * len;
      tz -= nz * len;
      // normalize vector
      len = 1.0 / Math.sqrt(tx * tx + ty * ty + tz * tz);
      tx *= len;
      ty *= len;
      tz *= len;

      // bi normal/tangent
      var bix = ny * tz - nz * ty;
      var biy = nz * tx - nx * tz;
      var biz = nx * ty - ny * tx;

      // displacement/detail vector (object space)
      var dx = vArUp[j] - downSubd[j];
      var dy = vArUp[j + 1] - downSubd[j + 1];
      var dz = vArUp[j + 2] - downSubd[j + 2];

      // order : n/t/bi
      dAr[j] = nx * dx + ny * dy + nz * dz;
      dAr[j + 1] = tx * dx + ty * dy + tz * dz;
      dAr[j + 2] = bix * dx + biy * dy + biz * dz;

      dColorAr[j] = cArUp[j] - subdColors[j];
      dColorAr[j + 1] = cArUp[j + 1] - subdColors[j + 1];
      dColorAr[j + 2] = cArUp[j + 2] - subdColors[j + 2];
    }
  };

  // /** Apply taubin smoothing */
  // Multiresolution.taubinSmoothing = function (meshUp, meshDown) {
  //   var vArUp = meshUp.verticesXYZ_;
  //   var vArDown = meshDown.verticesXYZ_;
  //   var tmp = new Float32Array(vArUp.length);
  //   // TODO which topology ? meshUp/meshDown?
  //   Multiresolution.laplaceSmooth(meshUp, tmp, vArUp, 0.65);
  //   Multiresolution.laplaceSmooth(meshUp, vArDown, tmp, -0.68);
  // };

  // /** Apply laplaciant smoothing */
  // Multiresolution.laplaceSmooth = function (mesh, target, source, factor) {
  //   var vertOnEdge = mesh.vertOnEdge_;
  //   var vrrStartCount = mesh.vrrStartCount_;
  //   var vertRingVert = mesh.vertRingVert_;
  //   var nbVerts = target.length / 3;
  //   var sx = 0.0,
  //     sy = 0.0,
  //     sz = 0.0;
  //   var j = 0,
  //     is = 0;
  //   for (var i = 0; i < nbVerts; ++i) {
  //     var it = i * 3;
  //     var start = vrrStartCount[i * 2];
  //     var count = vrrStartCount[i * 2 + 1];
  //     var avx = 0.0,
  //       avy = 0.0,
  //       avz = 0.0;
  //     if (vertOnEdge[i] === 1) {
  //       var nbVertEdge = 0;
  //       for (j = 0; j < count; ++j) {
  //         is = vertRingVert[start + j];
  //         //we average only with vertices that are also on the edge
  //         if (vertOnEdge[is] === 1) {
  //           is *= 3;
  //           avx += source[is];
  //           avy += source[is + 1];
  //           avz += source[is + 2];
  //           ++nbVertEdge;
  //         }
  //       }
  //       count = nbVertEdge;
  //     } else {
  //       for (j = 0; j < count; ++j) {
  //         is = vertRingVert[start + j] * 3;
  //         avx += source[is];
  //         avy += source[is + 1];
  //         avz += source[is + 2];
  //       }
  //     }
  //     sx = source[it];
  //     sy = source[it + 1];
  //     sz = source[it + 2];
  //     target[it] = sx + ((avx / count) - sx) * factor;
  //     target[it + 1] = sy + ((avy / count) - sy) * factor;
  //     target[it + 2] = sz + ((avz / count) - sz) * factor;
  //   }
  // };
  return Multiresolution;
});