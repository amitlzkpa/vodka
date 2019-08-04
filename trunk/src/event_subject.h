#pragma once
#include "whelk.h"

namespace whelk 
{
	class EventObserver;
	class Event;
	class EventSubject
	{
	private:
		list<EventObserver*> observers[11];

	public:
		EventSubject();
		virtual ~EventSubject();
		void subscribe(int type, EventObserver *eo);
		void unsubscribe(int type, EventObserver *eo);
		void notifyObservers(Event *e);
	};
}

extern EventSubject GES;