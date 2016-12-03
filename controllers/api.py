# Here go your api methods.
import datetime
from datetime import timedelta
from template import render
import StringIO
import os

def get_user_full_name(user_id):
    user = db(db.auth_user.id == user_id).select().first()
    return user.first_name + ' ' + user.last_name


def translate_event(event):
    """
    :param event: event row we need to create the marker dictionary for
    :return: a dictionary corresponding to all information needed to render the event on the front end
    """
    event_dict = dict()

    event_dict['lat'] = event.latitude
    event_dict['lng'] = event.longitude
    if auth.user and event.creator == auth.user.id:
        event_dict['modifiable'] = True
    else:
        event_dict['modifiable'] = False
    event_dict['creator'] = get_user_full_name(event.creator)
    event_dict['occurs_at'] = event.occurs_at
    event_dict['title'] = event.title
    event_dict['description'] = event.description
    event_dict['edited_on'] = event.edited_on
    logged_in_infobox ='<div class="btn btn-group">{}</div>'
    #lol how is there not a better way to do this in vue

    event_dict['id'] = event.id
    if auth.user:
        check = db(db.confirmations.event_id == event.id,
                   db.confirmations.user_id == auth.user.id).select().first()
        if check:
            event_dict['attending'] = check.confirmation
        else:
            event_dict['attending'] = False
    else:
        event_dict['attending'] = False
    confirmations = [x for x in db(db.confirmations.event_id == event.id).select()]
    positive = []
    negative = []
    for conf in confirmations:
        if conf.confirmation is True:
            positive.append(conf)
        else:
            negative.append(conf)

    event_dict['total_attendees'] = len(positive)
    event_dict['total_haters'] = len(negative)

    content_template= """
<div class="center">
    <h5>
        {{=event['title']}}
    </h5>
    <p style="white-space: pre-space;">
        {{=event['description']}}
    </p>
    <span class="row">
        Liked by: {{=event['total_attendees']}} users
    </span>
    <span class="row">
        Disliked by: {{=event['total_haters']}} users
    </span>
    {{if auth.user:}}
        <div class="btn-group-sm btn-group">
            <button onclick="APP.vue.fire({{= str(event['id'])}})" class="btn btn-success">
                Like
            </button>
            <button onclick="APP.vue.del({{= str(event['id'])}})" class="btn btn-warning">
                Dislike
            </button>
        </div>
    {{pass}}
</div>
    """

    if len(positive) > len(negative):
        event_dict['marker_url'] = URL('static', 'images/fire.png')
        print('fire af')
    elif len(positive) < len(negative):
        event_dict['marker_url'] = URL('static', 'images/poopoo.png')
        print('poopoo af')
    else:
        #MAKE IT DO EGGPLANT
        event_dict['marker_url'] = URL('static', 'images/eggplant.png')
        print('eggplant')

    #how is it this hard to do server side rendering in web2py?
    event_dict['infobox_content'] = render(content=content_template, context=dict(event=event_dict, auth=auth))

    return event_dict

#Stanley added this
def litevents():
    events = db(db.events.occurs_at > (datetime.datetime.utcnow() - timedelta(hours=2))
                                       ).select(orderby=~db.events.occurs_at)
    return_dict = {'events': []}
    for event in events:
        return_dict['events'].append(translate_event(event))
    return_dict['events'].sort(key = lambda event: event['total_attendees'])
    return response.json(return_dict)

def getmarkers():
    events = db(db.events.occurs_at > (datetime.datetime.utcnow() - timedelta(hours=2))
                                       ).select(orderby=~db.events.occurs_at)
    return_dict = {'events': []}
    for event in events:
        return_dict['events'].append(translate_event(event))
    return_dict['loggedin'] = True if auth.user is not None else False
    return response.json(return_dict)

@auth.requires_login()
def addevent():
    lat = float(request.vars.latitude) if request.vars.latitude else None
    lng = float(request.vars.longitude) if request.vars.longitude else None
    title = str(request.vars.title) if request.vars.title else None
    occur_date = str(request.vars.date) if request.vars.date else None
    description = str(request.vars.description) if request.vars.description else None
    if lat and lng and title and occur_date and description:
        occur_date = datetime.datetime.strptime(occur_date, "%Y-%m-%dT%H:%M:%S")
        # parses ISO string without timezones, as this is a pain to handle, call format on the moment
        # object in default_index.js
        event_id = db.events.insert(latitude=lat, longitude=lng, title=title, occurs_at=occur_date,
                                    description=description, creator=auth.user.id)
        event = db(db.events.id == event_id).select().first()
        response.status = 201
        return response.json(translate_event(event))
    else:
        response.status = 400
        return response.json(dict());

@auth.requires_login()
def deleteevent():
    #if you make an event so lit even you can't handle it?
    event_id = request.vars.event_id
    user_id = auth.user.id
    db((db.events.id == event_id) & (db.events.created_by == user_id)).delete()

def checklogin():
    return response.json(dict(islogged= auth.user is not None))


@auth.requires_login()
def confirm():
    print('huh')
    event_id = request.vars.event_id
    user_id = auth.user.id
    is_real = False if request.vars.isreal == 'false' else True
    event = db((db.confirmations.user_id==user_id) & (db.confirmations.event_id == event_id)).select().first()
    if event:
        print('okay weird')
        print(event)
        event.update_record(confirmation=is_real)

    else:
        print('huh')
        db.confirmations.insert(user_id=user_id, event_id=event_id, confirmation=is_real)
    response.status = 201
    return response.json('wegudfam')
