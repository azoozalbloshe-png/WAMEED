from app.tests.test_platform import estate

def test_saved_meter_reading_response_has_persisted_identity_date_and_notes(client,db,estate):
    owner,p,t,c,h,other=estate
    created=client.post('/api/real-estate/meters',headers=h,json={'property_id':p.id,'meter_type':'electricity','meter_number':'READING-RESPONSE-TEST'})
    assert created.status_code==201,created.text
    meter_id=created.json()['id']
    response=client.post(f'/api/real-estate/meters/{meter_id}/calculate?current_reading=10&notes=Saved%20note',headers=h)
    assert response.status_code==200,response.text
    saved=response.json()
    assert saved['id']>0 and saved['reading_date'] and saved['notes']=='Saved note'
    assert saved['previous_reading']==0 and saved['current_reading']==10 and saved['units_consumed']==10
    history=client.get(f'/api/real-estate/meters/{meter_id}/readings',headers=h).json()
    assert history[0]['id']==saved['id'] and history[0]['total_cost']==saved['total_cost']
