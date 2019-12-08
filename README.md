# rubik
This is a javascript project that creates an interactive Rubik's cube.  It has a built-in cube solver.

To deploy, copy rubik.html, solver.d, and lib to a directory in your web server, such as /var/www/html.

To rotate the cube around and look at its sides or back, click and drag anywhere in the black background area.

To move a side of the cube, click on a face and drag in the direction you want the side to move.

If you've made some progress and are about to set off into new territory, you can hit "Record", which will start recording your moves from that point.

"Rewind" will play those moves backward and get you back to the point at which you hit "Record".

"Solve" will generate a sequence of moves to get the cube back into a solved state.  The solution may take a hundred or more moves.  This can be funny for you (embarrassing for me!) if you "Scramble" the cube by making only a few moves.

The quickest way to get the cube back to the starting point is to refresh the browser window containing the Rubik web page.  This is a lot easier than what I used to do when I was first trying to solve the cube.  Let's just say that involved a screwdriver..
