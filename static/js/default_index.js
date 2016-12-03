// This is the js for the default/index.html view.
var app = function() {

    var self = {};

    Vue.config.silent = false; // show all warnings

    // Extends an array
    self.extend = function(a, b) {
        for (var i = 0; i < b.length; i++) {
            a.push(b[i]);
        }
    };

    self.show_events = function() {
        self.vue.map.addMarkers(self.vue.events.map(make_marker_dict));
    };

    self.auto_refresh = function () {
        setInterval(
            self.load_events, 60*1000
        )
    };

    self.initmap = function() {
        self.vue.map = new GMaps({
            el: '#map',
            lat: 36.9914,
            lng: -122.0609
        });
        var options = [];
        console.log(self.vue.islogged);
        if (self.vue.islogged) {
            console.log('hmmm');
            options.push(
                {
                    title: 'Add marker',
                    name: 'add_marker',
                    action: function (e) {
                        if (self.vue.currTempMarker != null) {
                            this.removeMarker(self.vue.currTempMarker);
                        }
                        self.vue.currTempMarker = this.addMarker({
                            lat: e.latLng.lat(),
                            lng: e.latLng.lng(),
                            title: 'Current Temporary Marker'
                        });
                        console.log(self.vue.currTempMarker);
                    }
                }
            )
        }
        //only add context menu if we have options to add to it
        if (options.length > 0) {
            self.vue.map.setContextMenu({
                control: 'map',
                options: options
            });
        }
        //add controls for geolocating user location
        self.vue.map.addControl({
            position: 'top_center',
            content: 'Geolocate',
            style: {
                margin: '5px',
                padding: '1px 6px',
                border: 'solid 1px #717B87',
                background: '#fff'
            },
            events: {
                click: function(){
                    if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(function(position) {
                            var pos = {
                                lat: position.coords.latitude,
                                lng: position.coords.longitude
                            };
                            self.vue.map.setCenter(pos);
                        }, function() {
                            alert('Your browser is old AF!');
                        });
                    }
                }
            }
        });
        //now load the events
        self.first_load();
        self.vue.map.addListener('idle', self.load_events);
    };

    self.first_load = function () {
        self.load_events();
        $("#vue-div").show();
    };

    make_infobox = function(event) {
        template = '<p>test</p>'
    };

    make_marker_dict = function(event) {
        return {
            lat: event.lat,
            lng: event.lng,
            desc: event.description,
            title: event.title,
            infoWindow: {
                content: event.infobox_content
            },
            icon: event.marker_url
        };
        //console.log(event);
    };

    make_feedback = function(id, bool){
        console.log(bool);
        $.post(
            feedbackUrl,
            {
                event_id: id,
                isreal: bool
            },
            function(data){
                console.log(data);
                console.log("huh");
                self.load_events();
            }
        )
    };


    self.fire = function(id){
        // this likes an event
        console.log("FIRE");
        console.log("WE STARTED THE FIRE AT" + id.toString());
        /*is googoo*/
        make_feedback(id, true);
    };
    self.del =  function(id) {
        //this dislikes an event
        console.log("NOFIRE");
        console.log("WE STOPPED THE FIRE AT" + id.toString());
        /* is poopoo*/
        make_feedback(id, false);
    };


    self.add_to_map = function(event) {
        // addMarker is a Gmaps method
        self.vue.map.addMarker(make_marker_dict(event));
    };


    self.add_event_marker = function() {
        //user can add an event by either placing marker directly on map or by
        //inputting address into search
        var moment = $('#datetimepicker1').data("DateTimePicker").date();
        if(self.vue.title == '' || self.vue.desc == '' || moment == null){
            //handle error about invalid
            self.vue.inputError = true;
            console.log('cool');
        } else {
            var latitude, longitude;
            if (self.vue.usingMapMarker) {
                if(self.vue.currTempMarker == null) {
                    //raise error about not selecting a location for the event
                    self.vue.markerError = True;
                } else {
                    pos = self.vue.currTempMarker.getPosition();
                    latitude = pos.lat();
                    longitude = pos.lng();
                    $.post(addEventUrl,
                        {
                            latitude: latitude,
                            longitude: longitude,
                            title: self.vue.title,
                            description: self.vue.desc,
                            date: moment.utc().format('YYYY-MM-DDTHH:mm:ss')
                        },
                        function(data) {
                            self.add_to_map(data);
                            console.log(data);
                        })
                        .fail(function() {
                            //flash the inputError to the user
                            //in case the server ran into an error not parsed by front end
                            self.vue.inputError = true;
                            console.log('cool');
                        });
                }
            } else {
                //otherwise we try and use address
                if (self.vue.addr != '') {
                    GMaps.geocode({
                        address: self.vue.addr.trim(),
                        callback: function(results, status) {
                            if(results.length > 0) {
                                var latlng = results[0].geometry.location;
                                console.log(latlng);
                                $.post(addEventUrl,
                                    {
                                        latitude: latlng.lat(),
                                        longitude: latlng.lng(),
                                        title: self.vue.title,
                                        description: self.vue.desc,
                                        date: moment.utc().format('YYYY-MM-DDTHH:mm:ss')
                                    },
                                    function(data) {
                                        self.add_to_map(data);
                                        console.log(data);
                                    })
                                    .fail(function() {
                                        //flash the inputError to the user
                                        //in case the server ran into an error not parsed by front end
                                        self.vue.inputError = true;
                                        console.log('cool');
                                    });

                            } else {
                                console.log("Could not Find This Address!");
                                self.vue.addressError = true;
                            }
                        }
                    });
                } else {
                    console.log("No Address Entered!");
                    self.vue.inputError = true;
                }
            }
        }
    };

    self.load_events = function() {
        $.get(getMarkerUrl, function(data) {
            if (!cmpevents(data.events, self.vue.events) || self.vue.swappedPage){
                console.log(data.events);
                console.log(self.vue.events);
                self.vue.map.removeMarkers();
                self.vue.events = data.events;
                self.show_events();
                self.vue.swappedPage = false;
            }
        })
    };

    //stanley added this
    self.add_event_form = function () {
          self.goto('event_add');
    };

    //Stanley added this
    self.goto = function(page){
        self.vue.page = page;
        if(page == 'event_add'){
         //display form for user, dont forget to add vbind for logged in later!!
            self.vue.swappedPage = true;
            self.load_events();
        };
        if(page == 'event_watch'){
          $.get(litEventsUrl,
                function (data) {
                    console.log(data);
                    self.vue.hotevents = data.events;
                })
        };
    };

    self.check_login = function() {
        $.get(checkLoginUrl,
            function(data){
                self.vue.islogged = data.islogged;
                //if we had promises, I would use that instead, but don't want to inject
                //tons of other libraries
                self.initmap();
            }
        );
    };


    //compares two arrays of objects in javascript
    function equals(events1, events2, fields) {
        function _equals(obj1, obj2, fields) {
            if(obj1.length != obj2.length){
                return false;
            }
            else{
                for(var j = 0; j < obj1.length; j++){
                    for(var  i = 0; i < fields.length; i++) {
                        if( obj1[fields[i]] !== obj2[fields[i]]){
                            return false;
                        }
                    };
                }
            }
            return true;
        }
        return _equals(events1, events2, fields);
    }

    function cmpevents(events1, events2) {
        //used to make sure we don't constantly repopulate the events when it is not necessary
        var fields = ['creator', 'lat', 'lng', 'occurs_at', 'description',
            'edited_on', 'infobox_content', 'attending', 'total_haters',
            'total_attendees', 'marker_url']
        return equals(events1, events2, fields);
    };

    // Complete as needed.
    self.vue = new Vue({
        el: "#vue-div",
        delimiters: ['${', '}'],
        unsafeDelimiters: ['!{', '}'],
        data: {
            islogged  : false,
            page      : 'event_watch',
            events    : [],
            markers   : [],
            addr      : '',
            latt      : null,
            long      : null,
            title     : '',
            desc      : '',
            map       : null,
            //usingMapMarker allows users to place an event by marker in addition to address search
            usingMapMarker: false,
            //holds the current temporary marker if the user is
            currTempMarker: null,
            currTempMarkerPos: null,
            inputError: false,
            markerError: false,
            addressError: false,
            hotevents : [],
            swappedPage: false,
        },
        methods: {
            initmap         : self.initmap,
            add_event_marker: self.add_event_marker,
            add_event_form: self.add_event_form,
            goto: self.goto,
            fire: self.fire,
            del: self.del
        }
    });

    self.check_login(); //had to inject a lot of callbacks into this, would have loved promises, but don't
                        //know the best library
    self.auto_refresh(); //set to refresh page so we see all events
    self.goto('event_watch');

    $("#vue-div").show();
    return self;
};

var APP = null;

// This will make everything accessible from the js console;
// for instance, self.x above would be accessible as APP.x
jQuery(function(){APP = app();});
