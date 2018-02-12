/*
 * Copyright (C) 2018, Greg Johnson
 * Released under the terms of the GNU GPL v2.0.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  Refer to the
 * GNU General Public License for more details.
 */
/*
 This is a solver for the 3x3 Rubik's cube.

 It is meant to show how to solve the cube in simple individual steps.
 (Maybe at some later time, an alternate implementation that optimizes
 for fewest steps will be added.)

 Usage:
    var cube = new solver.Cube()

    // rotate red face, then green face, then blue face..
    cube.rotate('rgb')

  After creating a cube and scrambling it, the cube can be solved
  in a sequence of seven steps.  Each step modifies the cube, and
  returns a string containing the commands that perform the step.

    var step1 = cube.fixTopEdges()
    var step2 = cube.fixTopCorners()
    var step3 = cube.fixMiddles()
    var step4 = cube.fixBottomCornerPositions()
    var step5 = cube.fixBottomCornerOrientations()
    var step6 = cube.fixBottomEdgePositions()
    var step7 = cube.fixBottomEdgeOrientations()

  If desired, the above steps can be combined into a single
  function call:

    var solution = solver.solveCube(cube)

  The cube is assumed to have the following faces:

      blue:   top
      red:    bottom
      orange: front
      yellow: right
      white:  back
      green:  left

  The assumed cube geometry is as follows:
  
      the X axis points to the right, out through the yellow face.
      the Y axis points upward through the blue face.
      the Z axis points outward toward you, through the orange face.

  cube.rotate() takes a string.  Each letter is a
  rotation command, corresponding to the first letter
  of one of the above colors.
  
  Lower-case is a counter-clockwise rotation of the face,
  and upper-case is a clockwise rotation.

  Three additional handy commands are:

      i:  rotate the middle horizontal level (containing orange, yellow, white, and green center cubies)
      j:  rotate one middle vertical level (containing blue, yellow, red, and green center cubies)
      k:  rotate the other middle vertical level (containing orange, blue, white, and red center cubies)

  It may be that you have a scrambled cube you want to solve,
  but you don't have a sequence of rotations that gets to that scrambled state.

  The cube can be initialized to your scrambled state directly.
  This is done by updating the individual cubies of the cube one at a time.

  Create a cubie and initialize it with its 'solved' position:

  var cubie = new solver.Cubie(home_x, home_y, home_z)

  Modify the cubie to specify its position in the scrambled cube, and
  its scrambled orientation.

  Each cubie has its own X, Y, and Z axes, and in the solved state the
  cubie's X, Y, and Z axes match the X, Y, and Z axes of the cube.

  To specify a scrambled orientation for a cubie, give its X and Y
  axes in terms of the cube's coordinates.

  cubie.update(scrambled_x_position,
               scrambled_y_position,
               scrambled_z_position,

               cubie_x_axis.x,
               cubie_x_axis.y,
               cubie_x_axis.z, 

               cubie_y_axis.x,
               cubie_y_axis.y,
               cubie_y_axis.z)

  For example, the blue/yellow edge cubie is at position <1, 1, 0> in
  the solved state.  To flip that cubie but leave it in position:

      cubie.update(1, 1, 0,   -- same position
                   0, 1, 0,   -- cubie X axis pointing in cube Y direction
                   1, 0, 0)   -- cubie Y axis pointing in cube X direction

  The blue/yellow/orange corner cubie is at position <1, 1, 1> in
  the solved state.  To rotate that cubie clockwise 120 degrees
  but leave it in position:

      cubie.update(1, 1, 1,   -- same position
                   0, 0, 1,   -- cubie X axis pointing in cube Z direction
                   1, 0, 0)   -- cubie Y axis pointing in cube X direction

  Then, update the cube with the modified cubie:

      cube.updateCubie(cubie)

  The cubie that has the same solved (or home) position as the updated cubie
  will be overwritten.

  You can use this API to create a seriously broken cube.  (Multiple cubies
  at the same location, cubies with impossible orientations, etc.)  I made
  a somewhat half-hearted effort to make the solver robust in those cases,
  but basically you are on your own if you feed the solver an impossible cube.
 */

var upperCCW  = [[ 0,  0,  1],
                 [ 0,  1,  0],
                 [-1,  0,  0]]
upperCCW.face = function(x,y,z) { return y == 1 }

var upperCW  = [[ 0,  0, -1],
                [ 0,  1,  0],
                [ 1,  0,  0]]
upperCW.face = function(x,y,z) { return y == 1 }

var lowerCCW = [[ 0,  0, -1],
                [ 0,  1,  0],
                [ 1,  0,  0]]
lowerCCW.face = function(x,y,z) { return y == -1 }

var lowerCW  = [[ 0,  0,  1],
                [ 0,  1,  0],
                [-1,  0,  0]]
lowerCW.face = function(x,y,z) { return y == -1 }

var leftCCW = [[ 1,  0,  0],
               [ 0,  0,  1],
               [ 0, -1,  0]]
leftCCW.face = function(x,y,z) { return x == -1 }

var leftCW  = [[ 1,  0,  0],
               [ 0,  0, -1],
               [ 0,  1,  0]]
leftCW.face = function(x,y,z) { return x == -1 }

var rightCCW = [[ 1,  0,  0],
                [ 0,  0, -1],
                [ 0,  1,  0]]
rightCCW.face = function(x,y,z) { return x == 1 }

var rightCW  = [[ 1,  0,  0],
                [ 0,  0,  1],
                [ 0, -1,  0]]
rightCW.face = function(x,y,z) { return x == 1 }

var frontCCW = [[ 0, -1,  0],
                [ 1,  0,  0],
                [ 0,  0,  1]]
frontCCW.face = function(x,y,z) { return z == 1 }

var frontCW  = [[ 0,  1,  0],
                [-1,  0,  0],
                [ 0,  0,  1]]
frontCW.face = function(x,y,z) { return z == 1 }

var backCCW = [[ 0,  1,  0],
               [-1,  0,  0],
               [ 0,  0,  1]]
backCCW.face = function(x,y,z) { return z == -1 }

var backCW  = [[ 0, -1,  0],
               [ 1,  0,  0],
               [ 0,  0,  1]]
backCW.face = function(x,y,z) { return z == -1 }

function onLower(cubie) {
    return cubie.posn.y == -1
}

function onMiddle(cubie) {
    return cubie.posn.y == 0
}

function onUpper(cubie) {
    return cubie.posn.y == 1
}

function blueFaceDown(cubie) {
    return cubie.Y.eq(negY)
}

function blueFaceUp(cubie) {
    return cubie.Y.eq(Y)
}

function blueFaceSideways(cubie) {
    return (!blueFaceUp(cubie) && !blueFaceDown(cubie))
}

function findCubie(cube,x,y,z) {
    if (typeof x == 'number') {
        for (var i = 0; i < 27; ++i) {
            var cubie = cube[i]
            if (cubie.posn.x == x && cubie.posn.y == y && cubie.posn.z == z) {
                return cubie
            }
        }
    } else {
        return findCubie(cube, x.x, x.y, x.z)
    }
    console.log('findCubie failed on ',x,y,z)
}

function findHomeCubie(cube,x,y,z) {
    for (var i = 0; i < 27; ++i) {
        var cubie = cube[i]
        if (cubie.homePosn.x == x && cubie.homePosn.y == y && cubie.homePosn.z == z) {
            return cubie
        }
    }
}

function Vector(x,y,z) {
    var result
    if (typeof x != 'number') {
        z = x.z
        y = x.y
        x = x.x
    }
    result = [x,y,z]
    result.x = x
    result.y = y
    result.z = z
    result.eq =      function(x,y,z)  {
                         if (typeof x != 'number') {
                            z = x.z
                            y = x.y
                            x = x.x
                         }
                         return this.x == x && this.y == y && this.z == z;
                     }
    result.ne =      function(x,y,z)  { return !this.eq(x,y,z) }
    result.plus =    function (other) { return Vector(this.x + other.x, this.y + other.y, this.z + other.z) }
    result.minus =   function (other) { return Vector(this.x - other.x, this.y - other.y, this.z - other.z) }
    result.neg =     function()       { return Vector(-this.x, -this.y, -this.z) }
    result.matmult = function(mat)    { return matmult(mat, this) }

    return result
}

var X = new Vector(1, 0, 0)
var Y = new Vector(0, 1, 0)
var Z = new Vector(0, 0, 1)

var negX = new Vector(-1, 0, 0)
var negY = new Vector(0, -1, 0)
var negZ = new Vector(0, 0, -1)

function matmult(mat, vec) {
    var outvec = [0,0,0]
    for (var r = 0; r < 3; ++r) {
        var sum = 0
        for (var c = 0; c < 3; ++c) {
            sum += vec[c] * mat[r][c]
        }
        outvec[r] = sum
    }
    return new Vector(outvec[0], outvec[1], outvec[2])
}

function crossProduct(u, v) {
    var s1 = u[1]*v[2] - u[2]*v[1]
    var s2 = u[2]*v[0] - u[0]*v[2]
    var s3 = u[0]*v[1] - u[1]*v[0]

    return new Vector(s1,s2,s3)
}

function isCenter(x,y,z) {
    var zeroCount = 0
    if (x == 0) ++zeroCount
    if (y == 0) ++zeroCount
    if (z == 0) ++zeroCount
    return zeroCount == 2
}

function addRotMatrixAndColor(cubie) {
    if (cubie.posn.x == -1) { cubie.rotmat = leftCCW;  cubie.color = 'g' }
    if (cubie.posn.x ==  1) { cubie.rotmat = rightCCW; cubie.color = 'y' }
    if (cubie.posn.y == -1) { cubie.rotmat = lowerCCW; cubie.color = 'r' }
    if (cubie.posn.y ==  1) { cubie.rotmat = upperCCW; cubie.color = 'b' }
    if (cubie.posn.z == -1) { cubie.rotmat = backCCW;  cubie.color = 'w' }
    if (cubie.posn.z ==  1) { cubie.rotmat = frontCCW; cubie.color = 'o' }
}

var Cubie = function(x,y,z) {
    if (   (typeof x != 'number' || x != -1 && x != 0 && x != 1)
        || (typeof y != 'number' || y != -1 && y != 0 && y != 1)
        || (typeof z != 'number' || z != -1 && z != 0 && z != 1)) {
        throw "invalid Cubie"
    }
    this.id   = '<' + x + ',' + y + ',' + z + '>'

    this.homePosn = new Vector(x,y,z)
    this.posn     = new Vector(x,y,z)

    this.X = new Vector(1, 0, 0)
    this.Y = new Vector(0, 1, 0)
    this.Z = new Vector(0, 0, 1)

    this.rotate = function(angleMatrix) {
        this.X = this.X.matmult(angleMatrix)
        this.Y = this.Y.matmult(angleMatrix)
        this.Z = this.Z.matmult(angleMatrix)

        this.posn = this.posn.matmult(angleMatrix)
    }

    if (isCenter(x,y,z)) {
        addRotMatrixAndColor(this)
    }

    this.update = function(x,y,z,
                           xAxis_x, xAxis_y, xAxis_z,
                           yAxis_x, yAxis_y, yAxis_z)
    {
        this.posn = new Vector(x,y,z)

        this.X = new Vector(xAxis_x, xAxis_y, xAxis_z)
        this.Y = new Vector(yAxis_x, yAxis_y, yAxis_z)
        this.Z = crossProduct(this.X, this.Y)
    }
}

function rotateAllCubies(cube, vec) {
    for (var i = 0; i < 27; ++i) {
        var cubie = cube[i]
        if (vec.face(cubie.posn.x, cubie.posn.y, cubie.posn.z)) {
            cubie.rotate(vec)
        }
    }
}

function rotateCube(cube, cmds) {
    var result = ''
    if (typeof cmds == 'string') {
        for (var i = 0; i < cmds.length; ++i) {
            switch (cmds.charAt(i)) {
                case 'r' : cube.rotate(lowerCCW); break
                case 'w' : cube.rotate(backCCW); break
                case 'b' : cube.rotate(upperCCW); break
                case 'o' : cube.rotate(frontCCW); break
                case 'y' : cube.rotate(rightCCW); break
                case 'g' : cube.rotate(leftCCW); break
                case 'R' : cube.rotate(lowerCW); break
                case 'W' : cube.rotate(backCW); break
                case 'B' : cube.rotate(upperCW); break
                case 'O' : cube.rotate(frontCW); break
                case 'Y' : cube.rotate(rightCW); break
                case 'G' : cube.rotate(leftCW); break
                case 'i' : cube.rotate('Br'); break
                case 'I' : cube.rotate('bR'); break
                case 'j' : cube.rotate('Ow'); break
                case 'J' : cube.rotate('oW'); break
                case 'k' : cube.rotate('Gy'); break
                case 'K' : cube.rotate('gY'); break
            }
        }
        return cmds

    } else {
        rotateAllCubies(cube, cmds)
    }

}

function otherColor(c) {
    if (c >= 'A' && c <= 'Z') return c.toLowerCase();
    else return c.toUpperCase();
}

function reverse(cmds) {
    var result = ''
    for (var i = cmds.length - 1; i >= 0; --i) {
        result += otherColor(cmds.charAt(i))
    }
    return result
}

/* looks ok.. (matches lua version on tests)
 */
function fixTopEdge(cube,cubie,depth) {
    depth = depth || 0; if (depth > 10) return ''

    var result = ''

    if (cubie.posn.eq(cubie.homePosn) && blueFaceUp(cubie)) {
        return result
    }

    /* bottom row, face down:  rotate bottom face, then 180 degrees into place.
    */
    if (onLower(cubie) && blueFaceDown(cubie)) {
        while (cubie.posn.x != cubie.homePosn.x || cubie.posn.z != cubie.homePosn.z) {
            result += cube.rotate('R')
        }

        var cmd
             if (cubie.posn.x == -1) { cmd = 'gg'; }
        else if (cubie.posn.x ==  1) { cmd = 'yy'; }
        else if (cubie.posn.z ==  1) { cmd = 'oo'; }
        else                         { cmd = 'ww'; }

        return result + cube.rotate(cmd)
    }

    /* top row, face up:  to bottom row, face down
    */
    if (onUpper(cubie) && blueFaceUp(cubie)) {
        var cmd
             if (cubie.posn.x == -1) { cmd = 'gg' }
        else if (cubie.posn.x ==  1) { cmd = 'yy' }
        else if (cubie.posn.z ==  1) { cmd = 'oo' }
        else                         { cmd = 'ww' }

        return result + cube.rotate(cmd) + fixTopEdge(cube, cubie,depth+1)
    }

    /* middle level.  rotate top level into position,
       then rotate middle cube to top.
       finally, rotate top level back.
     */
    if (onMiddle(cubie)) {
        var center    = findCubie(cube, cubie.posn.minus(cubie.Y))
        var dest      = new Vector(center.posn.x, 1, center.posn.z)
        var homeCubie = findCubie(cube, cubie.homePosn)

        var move1 = ''
        while (homeCubie.posn.ne(dest)) {
            move1 += cube.rotate('b')
        }
        result = move1

        while (!onUpper(cubie)) {
            result += cube.rotate(center.color)
        }

        return result + cube.reverse(move1)
    }

    /* top row, face out:  rotate it to middle level.
     */
    if (onUpper(cubie) && blueFaceSideways(cubie)) {
        var center = findHomeCubie(cube, cubie.posn.x, 0, cubie.posn.z)
        result = cube.rotate(center.color)

        return result + fixTopEdge(cube, cubie,depth+1)
    }

    /* bottom row, face out:  rotate it to middle level
     */
    if (onLower(cubie) && blueFaceSideways(cubie)) {
        /* get the cubie directly under its home position..
         */
        var dest = new Vector(cubie.homePosn.x, -1, cubie.homePosn.z)
        while (cubie.posn.ne(dest)) {
            result += cube.rotate('r')
        }

        var center = findCubie(cube, dest.plus(Y))
        result += cube.rotate(center.color)

        return result + fixTopEdge(cube, cubie,depth+1)
    }

    return result
}

/* assume corner cubie is directly under where we want to put it, and its blue
 * face is not facing down.  i.e, the nice little four-move thing will put it
 * where we want it.  however, we need to figure out if it's a clockwise or a
 * counter-clockwise sequence..
 */
var lowerCornerFourBangerUp = function(cube, cubie) {
    var result

    var sideCenterPosn = new Vector(cubie.posn.x, 0, cubie.posn.z).minus(cubie.Y)
    var sideCenter = findCubie(cube, sideCenterPosn)

    /* we are going to do bottom, side, unbottom, unside..
     */

    /* move bottom face, and figure out if it is supposed to be CW or CCW..
     */
    result = 'r'
    cube.rotate(lowerCCW)
    if (cubie.posn.x == sideCenter.posn.x || cubie.posn.z == sideCenter.posn.z) {
        result = 'R'
        cube.rotate(lowerCW)
        cube.rotate(lowerCW)
    }

    if (result == 'r') {
        /* move side face..
         */
        result += sideCenter.color
        cube.rotate(sideCenter.rotmat)

        /* unmove bottom face..
         */
        result += 'R'
        cube.rotate(lowerCW)

        /* unmove side face..
         */
        result += otherColor(sideCenter.color)
        cube.rotate(sideCenter.rotmat)
        cube.rotate(sideCenter.rotmat)
        cube.rotate(sideCenter.rotmat)
    } else {
        /* move side face..
         */
        result += otherColor(sideCenter.color)
        cube.rotate(sideCenter.rotmat)
        cube.rotate(sideCenter.rotmat)
        cube.rotate(sideCenter.rotmat)

        /* unmove bottom face..
         */
        result += 'r'
        cube.rotate(lowerCCW)

        /* unmove side face..
         */
        result += sideCenter.color
        cube.rotate(sideCenter.rotmat)
    }

    return result
}

function fixTopCorner(cube, cubie, depth) {
    depth = depth || 0; if (depth > 10) return ''
    var result = ''

    if (cubie.posn.eq(cubie.homePosn) && blueFaceUp(cubie)) {
        return result
    }

    /* bottom row, blue side out:  rotate under target, then 4-banger (left or right)
     */
    if (onLower(cubie) && blueFaceSideways(cubie)) {
        /* put the cubie under where it is supposed to end up..
         */
        while (cubie.posn.x != cubie.homePosn.x || cubie.posn.z != cubie.homePosn.z) {
            result += cube.rotate('r')
        }

        return result + lowerCornerFourBangerUp(cube, cubie)
    }

    /* top row, facing up, but wrong position..
     */
    if (onUpper(cubie) && blueFaceUp(cubie)) {
        var center
             if (cubie.posn.eq(new Vector(-1, 1, 1))) { center = findCubie(cube,  0, 0,  1) }
        else if (cubie.posn.eq(new Vector(-1, 1,-1))) { center = findCubie(cube, -1, 0,  0) }
        else if (cubie.posn.eq(new Vector( 1, 1,-1))) { center = findCubie(cube,  0, 0, -1) }
        else                                         { center = findCubie(cube,  1, 0,  0) }

        /* put it on the bottom, with blue face sideways..
         */
        result +=   cube.rotate(center.color)
                  + cube.rotate('R')
                  + cube.rotate(otherColor(center.color))

        return result + fixTopCorner(cube, cubie, depth+1)
    }

    /* top row, blue side out:  down then over to get to bottom row, blue side out.
     */
    if (onUpper(cubie) && blueFaceSideways(cubie)) {
        /* rotate it so that it is under where it started, with blue face sideways..
         */
        var myCenter = findCubie(cube, cubie.Y)
        var dest = new Vector(cubie.posn.x, -1, cubie.posn.z)

        var move1 = ''
        while (!cubie.posn.eq(dest)) {
            move1 += cube.rotate(myCenter.color)
        }

        result = move1 + cube.rotate('rr') + cube.reverse(move1)

        return result + fixTopCorner(cube, cubie, depth+1)
    }

    /* bottom row, blue side down:  put in position on top, blue side out.
     */
    if (onLower(cubie) && blueFaceDown(cubie)) {
        /* get it under its home position..
         */
        var dest = new Vector(cubie.homePosn.x, -1, cubie.homePosn.z)
        while (!cubie.posn.eq(dest)) {
            result += cube.rotate('r')
        }

        var center
             if (cubie.posn.eq(new Vector(-1, -1,  1))) { center = findCubie(cube, -1, 0,  0) }
        else if (cubie.posn.eq(new Vector(-1, -1, -1))) { center = findCubie(cube,  0, 0, -1) }
        else if (cubie.posn.eq(new Vector( 1, -1, -1))) { center = findCubie(cube,  1, 0,  0) }
        else                                            { center = findCubie(cube,  0, 0,  1) }

        /* get it into its home position, but blue face sideways..
         */
        result +=   cube.rotate('R')
                  + cube.rotate(otherColor(center.color))
                  + cube.rotate('r')
                  + cube.rotate(center.color)

        return result + fixTopCorner(cube, cubie, depth+1)
    }

    return result
}

function fixMiddle(cube, cubie, depth) {
    depth = depth || 0; if (depth > 10) return ''
    var result = ''

    if (cubie.posn.eq(cubie.homePosn) && blueFaceUp(cubie)) {
        return result
    }

    /* bottom row (on red side)
     */
    if (onLower(cubie)) {
        while (true) {
            var startSeq, topSeq

            /* cubie is in position, its yellow face over yellow center, orange on top.. */
            if (cubie.X.eq(X) && cubie.posn.x == 1 && cubie.Z.eq(negY)) {
                startSeq = 'W i y '; topSeq = 'R' 

            /* cubie is in position, its yellow face over yellow center, white on top.. */
            } else if (cubie.X.eq(X) && cubie.posn.x == 1 && cubie.Z.neg().eq(negY)) {
                startSeq = 'o I Y '; topSeq = 'r' 

            /* cubie is in position, its orange face over orange center, green on top.. */
            } else if (cubie.Z.eq(Z) && cubie.posn.z == 1 && cubie.X.neg().eq(negY)) {
                startSeq = 'Y i o '; topSeq = 'R' 

            /* cubie is in position, its orange face over orange center, yellow on top.. */
            } else if (cubie.Z.eq(Z) && cubie.posn.z == 1 && cubie.X.eq(negY)) {
                startSeq = 'g I O '; topSeq = 'r' 

            /* cubie is in position, its green face over green center, white on top.. */
            } else if (cubie.X.neg().eq(negX) && cubie.posn.x == -1 && cubie.Z.neg().eq(negY)) {
                startSeq = 'O i g '; topSeq = 'R' 

            /* cubie is in position, its green face over green center, orange on top.. */
            } else if (cubie.X.neg().eq(X.neg()) && cubie.posn.x == -1 && cubie.Z.eq(negY)) {
                startSeq = 'w I G '; topSeq = 'r' 

            /* cubie is in position, its white face over white center, yellow on top.. */
            } else if (cubie.Z.neg().eq(Z.neg()) && cubie.posn.z == -1 && cubie.X.eq(negY)) {
                startSeq = 'G i w '; topSeq = 'R' 

            /* cubie is in position, its white face over white center, green on top.. */
            } else if (cubie.Z.neg().eq(Z.neg()) && cubie.posn.z == -1 && cubie.X.neg().eq(negY)) {
                startSeq = 'y I W '; topSeq = 'r' 
            }

            if (startSeq && topSeq) {
                result +=   cube.rotate(startSeq)
                          + cube.rotate(topSeq)
                          + cube.rotate(reverse(startSeq))
                          + cube.rotate(reverse(topSeq))
                break

            } else {
                /* it's on the red level, but not in position.
                   rotate the red level and try again..
                 */
                result += cube.rotate('r')
            }
        }

    } else if (onMiddle(cubie)) {
             if (cubie.posn.eq(new Vector(-1, 0, -1))) { result += cube.rotate('yIW r wiY R') }
        else if (cubie.posn.eq(new Vector(-1, 0,  1))) { result += cube.rotate('wIG r giW R') }
        else if (cubie.posn.eq(new Vector( 1, 0, -1))) { result += cube.rotate('oIY r yiO R') }
        else if (cubie.posn.eq(new Vector( 1, 0,  1))) { result += cube.rotate('gIO r oiG R') }

        result += fixMiddle(cube, cubie, depth+1)
    }

    return result
}

/* c1, c2, and c3 are corner cubes to be rotated.
 * c2 is between c1 and c3.  (it shares a dimension with both of them.)
 * only works for bottom (red) face
 */
function rotateThreeWithMiddle(cube, c1,c2,c3) {
    var c1c2Face
         if (c1.posn.x ==  1 && c2.posn.x ==  1) { c1c2Face = findCubie(cube,  1, 0, 0) }
    else if (c1.posn.x == -1 && c2.posn.x == -1) { c1c2Face = findCubie(cube, -1, 0, 0) }
    else if (c1.posn.z == -1 && c2.posn.z == -1) { c1c2Face = findCubie(cube,  0, 0,-1) }
    else if (c1.posn.z ==  1 && c2.posn.z ==  1) { c1c2Face = findCubie(cube,  0, 0, 1) }

    var c2c3Face
         if (c2.posn.x ==  1 && c3.posn.x ==  1) { c2c3Face = findCubie(cube,  1, 0, 0) }
    else if (c2.posn.x == -1 && c3.posn.x == -1) { c2c3Face = findCubie(cube, -1, 0, 0) }
    else if (c2.posn.z == -1 && c3.posn.z == -1) { c2c3Face = findCubie(cube,  0, 0,-1) }
    else if (c2.posn.z ==  1 && c3.posn.z ==  1) { c2c3Face = findCubie(cube,  0, 0, 1) }

    var c2c3OppositeFace = findCubie(cube, c2c3Face.posn.neg())

    var across1 = ''
    do { across1 += cube.rotate(c2c3OppositeFace.color) } while (c1.posn.y != -1)

    var down1 = ''
    do { down1 += cube.rotate(c1c2Face.color) } while (c2.posn.y != -1)

    var wholeMove1 = across1 + down1
                       + cube.rotate(reverse(across1))
                       + cube.rotate(reverse(down1))

    var over1 = ''
    do { over1 += cube.rotate(c2c3Face.color) } while (c3.posn.y != -1)

    result = wholeMove1 + over1 +
             cube.rotate(reverse(wholeMove1)) + cube.rotate(reverse(over1))

    return result
}

/* rotate three same-face corner cubies
 */
function rotateThree(cube, c1,c2,c3, inPlace) {
    var middle = findCubie(cube, -inPlace.posn.x, -1, -inPlace.posn.z)

         if (middle == c1) { return rotateThreeWithMiddle(cube, c2, middle, c3) }
    else if (middle == c2) { return rotateThreeWithMiddle(cube, c1, middle, c3) }
    else                   { return rotateThreeWithMiddle(cube, c1, middle, c2) }
}

function fixOne(cube) {
    var c1 = findCubie(cube, -1, -1, -1)
    var c2 = findCubie(cube, -1, -1,  1)
    var c3 = findCubie(cube,  1, -1,  1)
    return rotateThreeWithMiddle(cube, c1,c2,c3)
}

function getHomeCount(cube, v1,v2,v3,v4) {
    var c1 = findCubie(cube, v1)
    var c2 = findCubie(cube, v2)
    var c3 = findCubie(cube, v3)
    var c4 = findCubie(cube, v4)

    var homecount = 0
    if (c1.posn.eq(c1.homePosn)) { ++homecount }
    if (c2.posn.eq(c2.homePosn)) { ++homecount }
    if (c3.posn.eq(c3.homePosn)) { ++homecount }
    if (c4.posn.eq(c4.homePosn)) { ++homecount }

    return homecount
}

function fixBottomCornerPositions(cube) {
    var result = ''

    var v1 = new Vector(-1, -1, -1)
    var v2 = new Vector(-1, -1,  1)
    var v3 = new Vector( 1, -1, -1)
    var v4 = new Vector( 1, -1,  1)

    var homeCount

    /* get at least one corner in its home position by rotating red face..
     */
    while ((homeCount = getHomeCount(cube, v1,v2,v3,v4)) == 0) {
        result += cube.rotate('r')
    }

    if (homeCount == 2) {
        result += cube.rotate('r')
        homeCount = getHomeCount(cube, v1,v2,v3,v4)
    }

    /* at this point, can't have just 2 in correct positions any more..
     * (you can never have just 3 in correct positions.)
     */
    while (homeCount < 4) {
        if (homeCount == 1) {
            var c1 = findCubie(cube, v1)
            var c2 = findCubie(cube, v2)
            var c3 = findCubie(cube, v3)
            var c4 = findCubie(cube, v4)

                 if (c1.posn.eq(c1.homePosn)) { result += rotateThree(cube,c2,c3,c4, c1) }
            else if (c2.posn.eq(c2.homePosn)) { result += rotateThree(cube,c1,c3,c4, c2) }
            else if (c3.posn.eq(c3.homePosn)) { result += rotateThree(cube,c1,c2,c4, c3) }
            else if (c4.posn.eq(c4.homePosn)) { result += rotateThree(cube,c1,c2,c3, c4) }

        } else {
            /* none are in the right place.
             * do a three-way to get one in the right place..
             */
            result += fixOne(cube)
        }

        homeCount = getHomeCount(cube, v1,v2,v3,v4)
    }
    return result
}

/* c1 is a corner cube.  put it in a fixed corner position
 * and rotate it so that it has the correct orientation.
 */
function rotateGreenRedOrangeCorner(cube, c1) {
    var result = ''
    var greenRedOrangeCorner = new Vector(-1, -1, 1)

    var c1Rotate = ''
    while (!c1.posn.eq(greenRedOrangeCorner)) { c1Rotate += cube.rotate('r') }

    result = c1Rotate

    if (c1.Y.neg().eq(negX)) {
        result += cube.rotate('BObo BObo')

    } else if (c1.Y.neg().eq(Z)) {
        result += cube.rotate('OBob OBob')
    }

    result += cube.rotate(reverse(c1Rotate))

    return result
}

function fixBottomCornerOrientations(cube) {
    var result = ''

    result += rotateGreenRedOrangeCorner(cube, findHomeCubie(cube, -1, -1, -1))
    result += rotateGreenRedOrangeCorner(cube, findHomeCubie(cube, -1, -1,  1))
    result += rotateGreenRedOrangeCorner(cube, findHomeCubie(cube,  1, -1, -1))
    result += rotateGreenRedOrangeCorner(cube, findHomeCubie(cube,  1, -1,  1))

    return result
}

/* assume 3 cubies are on the red side.
 * c1 is the middle of the three.
 * rotate those 3 cubies.
 */
function fixLeft(cube, c1) {
    var result = ''
    var redOrangeEdge = new Vector(0, -1, 1)

    var c1Rotate = ''
    for (var maxLoop = 4; maxLoop >= 0 && !c1.posn.eq(redOrangeEdge); --maxLoop) {
        c1Rotate += cube.rotate('r')
    }

    result = c1Rotate + cube.rotate('O')

    var move = 'Yi o '

    result +=  cube.rotate(move)
             + cube.rotate('rr')
             + cube.rotate(reverse(move))
             + cube.rotate('rr o')
             + cube.rotate(reverse(c1Rotate))

    return result
}

function fixBottomEdgeOrientation(cube, cubie) {
    var flipPosition = new Vector(0, -1, 1)

    var intoPosn = ''
    while (cubie.posn.ne(flipPosition)) {
        intoPosn += cube.rotate('r')
    }
    return intoPosn + cube.rotate(' oiG r Wiy R ') + cube.rotate(reverse(intoPosn))
}

function reverseBottomEdgeOrientation(cube, cubie) {
    var flipPosition = new Vector(1, -1, 0)

    var intoPosn = ''
    while (cubie.posn.ne(flipPosition)) {
        intoPosn += cube.rotate('r')
    }

    return intoPosn + cube.rotate(' YIw R gIO r ') + cube.reverse(intoPosn)
}

function fixBottomEdgeOrientations(cube) {
    var result = ''
    var c1 = findCubie(cube, -1, -1,  0)
    var c2 = findCubie(cube,  0, -1,  1)
    var c3 = findCubie(cube,  1, -1,  0)
    var c4 = findCubie(cube,  0, -1, -1)
    var forward = true

    if (!blueFaceUp(c1)) {
        result += fixBottomEdgeOrientation(cube, c1)
        forward = false
    }

    if (!blueFaceUp(c2)) {
        result += (forward &&     fixBottomEdgeOrientation(cube, c2)
                           ||  reverseBottomEdgeOrientation(cube, c2))
        forward = !forward
    }

    if (!blueFaceUp(c3)) {
        result += (forward &&     fixBottomEdgeOrientation(cube, c3)
                           ||  reverseBottomEdgeOrientation(cube, c3))
        forward = !forward
    }

    if (!blueFaceUp(c4)) {
        result += (forward &&     fixBottomEdgeOrientation(cube, c4)
                           ||  reverseBottomEdgeOrientation(cube, c4))
    }

    return result
}

function fixBottomEdgePositions(cube) {
    var result = ''
    var v1 = new Vector(-1, -1,  0)
    var v2 = new Vector( 0, -1,  1)
    var v3 = new Vector( 1, -1,  0)
    var v4 = new Vector( 0, -1, -1)
    var homecount

    for (var maxLoop = 4; maxLoop >= 0 && getHomeCount(cube, v1,v2,v3,v4) == 0; --maxLoop) {
        result += fixLeft(cube, findCubie(cube, v1))
    }

    if (homecount == 4) { return result }

    /* exactly one edge cubie is in place.
     * a three-way rotation will fix them all.
     */

    var c1 = findCubie(cube, v1)
    var c2 = findCubie(cube, v2)
    var c3 = findCubie(cube, v3)
    var c4 = findCubie(cube, v4)

    var cubieInPlace
         if (c1.posn.eq(c1.homePosn)) { cubieInPlace = c1 }
    else if (c2.posn.eq(c2.homePosn)) { cubieInPlace = c2 }
    else if (c3.posn.eq(c3.homePosn)) { cubieInPlace = c3 }
    else if (c4.posn.eq(c4.homePosn)) { cubieInPlace = c4 }

    var middlePosn = new Vector(-cubieInPlace.posn.x, -1, -cubieInPlace.posn.z)

    for (var maxLoop = 4; maxLoop >= 0 && getHomeCount(cube, v1,v2,v3,v4) != 4; --maxLoop) {
        result += fixLeft(cube, findCubie(cube, middlePosn))
    }

    return result
}

function cleanup(cmds) {
    var change 
    do {
        change = false
        c2 = cmds.replace(/r *R/, ''); change |= c2.length < cmds.length; cmds = c2
        c2 = cmds.replace(/w *W/, ''); change |= c2.length < cmds.length; cmds = c2
        c2 = cmds.replace(/g *G/, ''); change |= c2.length < cmds.length; cmds = c2
        c2 = cmds.replace(/b *B/, ''); change |= c2.length < cmds.length; cmds = c2
        c2 = cmds.replace(/o *O/, ''); change |= c2.length < cmds.length; cmds = c2
        c2 = cmds.replace(/y *Y/, ''); change |= c2.length < cmds.length; cmds = c2
        c2 = cmds.replace(/R *r/, ''); change |= c2.length < cmds.length; cmds = c2
        c2 = cmds.replace(/W *w/, ''); change |= c2.length < cmds.length; cmds = c2
        c2 = cmds.replace(/G *g/, ''); change |= c2.length < cmds.length; cmds = c2
        c2 = cmds.replace(/B *b/, ''); change |= c2.length < cmds.length; cmds = c2
        c2 = cmds.replace(/O *o/, ''); change |= c2.length < cmds.length; cmds = c2
        c2 = cmds.replace(/Y *y/, ''); change |= c2.length < cmds.length; cmds = c2

        c2 = cmds.replace(/y *y *y/, 'Y'); change |= c2.length < cmds.length; cmds = c2
        c2 = cmds.replace(/o *o *o/, 'O'); change |= c2.length < cmds.length; cmds = c2
        c2 = cmds.replace(/g *g *g/, 'G'); change |= c2.length < cmds.length; cmds = c2
        c2 = cmds.replace(/r *r *r/, 'R'); change |= c2.length < cmds.length; cmds = c2
        c2 = cmds.replace(/w *w *w/, 'W'); change |= c2.length < cmds.length; cmds = c2
        c2 = cmds.replace(/b *b *b/, 'B'); change |= c2.length < cmds.length; cmds = c2

        c2 = cmds.replace(/Y *Y *Y/, 'y'); change |= c2.length < cmds.length; cmds = c2
        c2 = cmds.replace(/O *O *O/, 'o'); change |= c2.length < cmds.length; cmds = c2
        c2 = cmds.replace(/G *G *G/, 'g'); change |= c2.length < cmds.length; cmds = c2
        c2 = cmds.replace(/R *R *R/, 'r'); change |= c2.length < cmds.length; cmds = c2
        c2 = cmds.replace(/W *W *W/, 'w'); change |= c2.length < cmds.length; cmds = c2
        c2 = cmds.replace(/B *B *B/, 'b'); change |= c2.length < cmds.length; cmds = c2
    } while (change);

    return cmds
}

var solveCube = function(cube) {
    var result = ''
    result += fixTopEdge(cube, findHomeCubie(cube,  0, 1,  1))
    result += fixTopEdge(cube, findHomeCubie(cube,  1, 1,  0))
    result += fixTopEdge(cube, findHomeCubie(cube,  0, 1, -1))
    result += fixTopEdge(cube, findHomeCubie(cube, -1, 1,  0))

    result += fixTopCorner(cube, findHomeCubie(cube, -1, 1, -1))
    result += fixTopCorner(cube, findHomeCubie(cube, -1, 1,  1))
    result += fixTopCorner(cube, findHomeCubie(cube,  1, 1, -1))
    result += fixTopCorner(cube, findHomeCubie(cube,  1, 1,  1))

    result += fixMiddle(cube, findHomeCubie(cube, -1, 0, -1))
    result += fixMiddle(cube, findHomeCubie(cube, -1, 0,  1))
    result += fixMiddle(cube, findHomeCubie(cube,  1, 0, -1))
    result += fixMiddle(cube, findHomeCubie(cube,  1, 0,  1))

    result += fixBottomCornerPositions(cube)

    result += fixBottomCornerOrientations(cube)

    result += fixBottomEdgePositions(cube)

    result += fixBottomEdgeOrientations(cube)

    return cleanup(result)
}

var Cube = function() {
    var index = 0
    for (var x = -1; x <= 1; ++x) {
        for (var y = -1; y <= 1; ++y) {
            for (var z = -1; z <= 1; ++z) {
                this[index++] = new Cubie(x,y,z)
            }
        }
    }
    this.solve = function() { return solveCube(this); }

    this.fixTopEdges                 = function() {
                                           var result = ''
                                           result += fixTopEdge(this, findHomeCubie(this,  0, 1,  1))
                                           result += fixTopEdge(this, findHomeCubie(this,  1, 1,  0))
                                           result += fixTopEdge(this, findHomeCubie(this,  0, 1, -1))
                                           result += fixTopEdge(this, findHomeCubie(this, -1, 1,  0))
                                           return cleanup(result)
                                       }
    this.fixTopCorners               = function() {
                                           var result = ''
                                           result += fixTopCorner(this, findHomeCubie(this, -1, 1, -1))
                                           result += fixTopCorner(this, findHomeCubie(this, -1, 1,  1))
                                           result += fixTopCorner(this, findHomeCubie(this,  1, 1, -1))
                                           result += fixTopCorner(this, findHomeCubie(this,  1, 1,  1))
                                           return cleanup(result)
                                       }
    this.fixMiddles                  = function() {
                                           var result = ''
                                           result += fixMiddle(this, findHomeCubie(this, -1, 0, -1))
                                           result += fixMiddle(this, findHomeCubie(this, -1, 0,  1))
                                           result += fixMiddle(this, findHomeCubie(this,  1, 0, -1))
                                           result += fixMiddle(this, findHomeCubie(this,  1, 0,  1))
                                           return cleanup(result)
                                       }
    this.fixBottomCornerPositions    = function() { return cleanup(fixBottomCornerPositions(this)); }
    this.fixBottomCornerOrientations = function() { return cleanup(fixBottomCornerOrientations(this)); }
    this.fixBottomEdgePositions      = function() { return cleanup(fixBottomEdgePositions(this)); }
    this.fixBottomEdgeOrientations   = function() { return cleanup(fixBottomEdgeOrientations(this)); }

    this.rotate                      = function(cmds) { return rotateCube(this, cmds); }
    this.reverse                     = function(cmds) { return this.rotate(reverse(cmds)); }

    this.updateCubie = function(cubie) {
        for (var i = 0; i < 27; ++i) {
            if (cubie.id == this[i].id) {
                this[i] = cubie
                break
            }
        }
    }
}

if (typeof module === 'object') {
    module.exports.Cube = Cube
    module.exports.Cubie = Cubie
    module.exports.solveCube = solveCube
} else {
    solver = {
        Cube:       Cube,
        Cubie:      Cubie,
        solveCube:  solveCube
    }
}
